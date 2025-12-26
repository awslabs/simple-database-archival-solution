"""
Copyright 2025 Amazon.com, Inc. and its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at

  https://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License.
"""

import boto3
import json
import logging
import os
import traceback
import re

# region Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()

if logger.hasHandlers():
    logger.setLevel(LOG_LEVEL)
else:
    logging.basicConfig(level=LOG_LEVEL)
# endregion

athena = boto3.client('athena')
ssm = boto3.client('ssm')
dynamodb = boto3.client('dynamodb')

def mask_sensitive_data(event):
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
            "Cache-Control": "no-cache, no-store",
            "Content-Type": "application/json",
        },
        "statusCode": http_code,
        "body": body,
    }

def transform_table_names(sql_statement, archive_id, database_name, table_details, views=None):
    """
    Transform user-friendly table names to Glue catalog names.
    Views are referenced by their actual name (no transformation needed).

    Example:
    Input:  SELECT * FROM public.table_name
    Output: SELECT * FROM "{archive_id}-{database}-database"."{archive_id}-{database}-public.table_name-table"

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
            # Match schema.table (e.g., public.table_name)
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

def lambda_handler(event, context):
    logger.info(mask_sensitive_data(event))

    try:
        body = json.loads(event["body"]) if "body" in event else json.loads(event)
        sql_statement = body.get("sql_statement")
        archive_id = body.get("archive_id")
        next_token = body.get("next_token")  # For pagination
        query_execution_id = body.get("query_execution_id")  # For fetching next pages

        # Get archive metadata
        archives_table_param = ssm.get_parameter(
            Name='/archive/dynamodb-table', WithDecryption=True)
        archives_table_name = archives_table_param['Parameter']['Value']

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
        database_name = archive_item.get('database', {}).get('S', '')

        # Parse table_details from DynamoDB format
        table_details = []
        if 'table_details' in archive_item and 'L' in archive_item['table_details']:
            for table_item in archive_item['table_details']['L']:
                if 'M' in table_item and 'table' in table_item['M']:
                    table_name = table_item['M']['table'].get('S', '')
                    if table_name:
                        table_details.append({'table': table_name})

        glue_database_name = f'{archive_id}-{database_name}-database'

        # Fetch views from Glue catalog
        glue = boto3.client('glue')
        views = []
        try:
            views_next_token = None
            while True:
                if views_next_token:
                    glue_response = glue.get_tables(
                        DatabaseName=glue_database_name,
                        NextToken=views_next_token
                    )
                else:
                    glue_response = glue.get_tables(
                        DatabaseName=glue_database_name
                    )

                # Filter for views only
                for table in glue_response.get('TableList', []):
                    if table.get('TableType') == 'VIRTUAL_VIEW':
                        views.append({'name': table.get('Name', '')})

                views_next_token = glue_response.get('NextToken')
                if not views_next_token:
                    break

            logger.info(f"Found {len(views)} views in database {glue_database_name}")
        except Exception as view_error:
            logger.warning(f"Failed to fetch views, continuing without them: {str(view_error)}")

        # If query_execution_id is provided, skip execution and fetch results
        # This is for pagination - reusing the same query execution
        if not query_execution_id:
            # Transform table names in SQL before execution
            # Views are passed so they won't be transformed
            transformed_sql = transform_table_names(
                sql_statement,
                archive_id,
                database_name,
                table_details,
                views
            )

            # Get S3 bucket for Athena results
            bucket_param = ssm.get_parameter(
                Name='/athena/s3-athena-temp-bucket', WithDecryption=True)
            bucket_path = bucket_param['Parameter']['Value']

            # Start new query execution with transformed SQL
            response = athena.start_query_execution(
                QueryString=transformed_sql,
                QueryExecutionContext={'Database': glue_database_name},
                ResultConfiguration={'OutputLocation': f's3://{bucket_path}'},
                WorkGroup='sdas'
            )

            query_execution_id = response["QueryExecutionId"]

            # Wait for query completion
            while True:
                query_state_response = athena.get_query_execution(
                    QueryExecutionId=query_execution_id
                )

                status = query_state_response["QueryExecution"]["Status"]["State"]

                if status == "FAILED":
                    error_reason = query_state_response["QueryExecution"]["Status"].get("StateChangeReason", "Unknown error")
                    logger.error(f"Query failed: {error_reason}")
                    return build_response(400, json.dumps({
                        "error": "Query execution failed",
                        "message": error_reason
                    }))
                elif status == "CANCELLED":
                    return build_response(400, json.dumps({
                        "error": "Query execution was cancelled"
                    }))
                elif status == "SUCCEEDED":
                    break

        # Get query results with pagination support
        page_size = body.get("page_size", 50)  # Default 50 rows per page
        page_size = min(page_size, 100) + 1  # +1 for header row, max 100 per page

        # Build get_query_results parameters
        get_results_params = {
            'QueryExecutionId': query_execution_id,
            'MaxResults': page_size
        }

        # If next_token is provided, include it for pagination
        if next_token:
            get_results_params['NextToken'] = next_token

        query_response = athena.get_query_results(**get_results_params)

        # Add query_execution_id to response for frontend to use in pagination
        response_data = {
            'ResultSet': query_response.get('ResultSet', {}),
            'NextToken': query_response.get('NextToken'),  # Will be None if no more pages
            'QueryExecutionId': query_execution_id,
            'UpdateCount': query_response.get('UpdateCount', 0)
        }

        return build_response(200, json.dumps(response_data))

    except Exception as ex:
        logger.error(traceback.format_exc())
        return build_response(500, json.dumps({
            "error": "Internal server error",
            "message": str(ex)
        }))
