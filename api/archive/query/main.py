""" 
Copyright 2025 Amazon.com, Inc. and its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at

  http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License.
"""

import boto3
import json
import logging
import os
import re
import traceback

from decimal import Decimal

# region Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()

if logger.hasHandlers():
    # The Lambda environment pre-configures a handler logging to stderr. If a handler is already configured,
    # `.basicConfig` does not execute. Thus we set the level directly.
    logger.setLevel(LOG_LEVEL)
else:
    logging.basicConfig(level=LOG_LEVEL)
# endregion

client = boto3.client('athena')
ssm = boto3.client('ssm')
dynamodb = boto3.client('dynamodb')

def transform_table_names(sql_statement, archive_id, database_name, table_details, views=None):
    """
    Transform user-friendly table names to Glue catalog names.
    Views are referenced by their actual name (no transformation needed).

    Example:
    Input:  SELECT * FROM public.tipo_docto
    Output: SELECT * FROM "{archive_id}-{database}-database"."{archive_id}-{database}-public.tipo_docto-table"

    Views: SELECT * FROM my_view  (no transformation)

    Args:
        sql_statement: User's SQL query
        archive_id: Archive UUID
        database_name: Database name from archive
        table_details: List of table metadata from DynamoDB
        views: Optional list of view names (views don't need transformation)

    Returns:
        Transformed SQL with full Glue catalog names for tables
    """
    if not table_details:
        logger.warning("No table_details provided for transformation")
        return sql_statement

    transformed_sql = sql_statement
    database_prefix = f'{archive_id}-{database_name}-database'

    # Get list of view names to avoid transforming them
    view_names = set()
    if views:
        view_names = {view.get('name', '') for view in views if view.get('name')}
        logger.info(f"Found {len(view_names)} views to preserve: {view_names}")

    # Create mapping from source table names to Glue catalog names
    for table in table_details:
        source_table = table.get('table', '')
        if not source_table:
            continue

        # Skip if this is actually a view name (views don't need transformation)
        if source_table in view_names:
            logger.info(f"Skipping transformation for view: {source_table}")
            continue

        # Full Glue catalog name with database and table
        glue_full_name = f'"{database_prefix}"."{archive_id}-{database_name}-{source_table}-table"'

        # Pattern to match table references in SQL
        # Handles: FROM table, JOIN table, table alias, etc.
        # Using word boundaries to avoid partial matches
        patterns = [
            # Match schema.table (e.g., public.tipo_docto)
            (r'\b' + re.escape(source_table) + r'\b', glue_full_name),
            # Match already quoted names (in case user used them)
            (r'"' + re.escape(source_table) + r'"', glue_full_name),
            # Match single-quoted (shouldn't happen in table names, but be safe)
            (r"'" + re.escape(source_table) + r"'", glue_full_name),
        ]

        for pattern, replacement in patterns:
            transformed_sql = re.sub(pattern, replacement, transformed_sql, flags=re.IGNORECASE)

    logger.info(f"Original SQL: {sql_statement}")
    logger.info(f"Transformed SQL: {transformed_sql}")

    return transformed_sql

def mask_sensitive_data(event):
    # remove sensitive data from request object before logging
    keys_to_redact = ["authorization"]
    result = {}
    for k, v in event.items():
        if isinstance(v, dict):
            result[k] = mask_sensitive_data(v)
        elif k in keys_to_redact:
            result[k] = "<redacted>"
        else:
            result[k] = v
    return result


def build_response(http_code, body):
    return {
        "headers": {
            # tell cloudfront and api gateway not to cache the response
            "Cache-Control": "no-cache, no-store",
            "Content-Type": "application/json",
        },
        "statusCode": http_code,
        "body": body,
    }


def lambda_handler(event, context):
    logger.info(mask_sensitive_data(event))

    body = json.loads(
        event["body"]) if "body" in event else json.loads(event)
    sql_statement = body["sql_statement"]
    archive_id = body["archive_id"]

    query_state_running = True

    try:
        # Get SSM parameter for S3 bucket
        parameter = ssm.get_parameter(
            Name='/athena/s3-athena-temp-bucket', WithDecryption=True)
        bucket_path = parameter['Parameter']['Value']

        # Get DynamoDB table name for archives
        archives_table_param = ssm.get_parameter(
            Name='/archive/dynamodb-table', WithDecryption=True)
        archives_table_name = archives_table_param['Parameter']['Value']

        # Fetch archive metadata from DynamoDB to get database name and table_details
        archive_response = dynamodb.get_item(
            TableName=archives_table_name,
            Key={'id': {'S': archive_id}}
        )

        if 'Item' not in archive_response:
            return build_response(404, json.dumps({
                "error": "Archive not found",
                "message": f"Archive with id {archive_id} does not exist"
            }))

        archive_item = archive_response['Item']
        database_name = archive_item.get('database', {}).get('S', 'bikestores')

        # Parse table_details from DynamoDB format
        table_details = []
        if 'table_details' in archive_item and 'L' in archive_item['table_details']:
            for table_item in archive_item['table_details']['L']:
                if 'M' in table_item and 'table' in table_item['M']:
                    table_name = table_item['M']['table'].get('S', '')
                    if table_name:
                        table_details.append({'table': table_name})

        # Database name is constructed from archive_id and database name
        database = f'{archive_id}-{database_name}-database'

        # Fetch views from Glue catalog
        glue = boto3.client('glue')
        views = []
        try:
            next_token = None
            while True:
                if next_token:
                    glue_response = glue.get_tables(
                        DatabaseName=database,
                        NextToken=next_token
                    )
                else:
                    glue_response = glue.get_tables(
                        DatabaseName=database
                    )

                # Filter for views only
                for table in glue_response.get('TableList', []):
                    if table.get('TableType') == 'VIRTUAL_VIEW':
                        views.append({'name': table.get('Name', '')})

                next_token = glue_response.get('NextToken')
                if not next_token:
                    break

            logger.info(f"Found {len(views)} views in database {database}")
        except Exception as view_error:
            logger.warning(f"Failed to fetch views, continuing without them: {str(view_error)}")

        # Transform table names in SQL before execution
        # Views are passed so they won't be transformed
        transformed_sql = transform_table_names(
            sql_statement,
            archive_id,
            database_name,
            table_details,
            views
        )

        response = client.start_query_execution(
            QueryString=transformed_sql,
            QueryExecutionContext={
                'Database': database
            },
            ResultConfiguration={
                'OutputLocation': f's3://{bucket_path}',
            },
            WorkGroup='sdas'
        )

        while query_state_running:

            query_state_response = client.get_query_execution(
                QueryExecutionId=response["QueryExecutionId"]
            )

            if query_state_response["QueryExecution"]["Status"]["State"] == "FAILED":
                return build_response(500, "Server Error")

            if query_state_response["QueryExecution"]["Status"]["State"] == "SUCCEEDED":
                query_state_running = False
                break

        query_response = client.get_query_results(
            QueryExecutionId=response["QueryExecutionId"],
            MaxResults=11
        )

        return build_response(200, json.dumps(query_response))

    except Exception as ex:
        logger.error(traceback.format_exc())
        return build_response(500, "Server Error")


if __name__ == "__main__":

    example_event = {}
    response = lambda_handler(example_event, {})
