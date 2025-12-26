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
import base64
import re

from decimal import Decimal

REGION = os.getenv("REGION")

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        return json.JSONEncoder.default(self, obj)


# region Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()

if logger.hasHandlers():
    logger.setLevel(LOG_LEVEL)
else:
    logging.basicConfig(level=LOG_LEVEL)
# endregion

ssm = boto3.client('ssm')
dynamodb = boto3.client('dynamodb')
glue = boto3.client('glue')

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
            "Cache-Control": "no-cache, no-store",
            "Content-Type": "application/json",
        },
        "statusCode": http_code,
        "body": body,
    }


def decode_presto_view(view_original_text):
    """
    Decode Presto view format from Athena.

    Athena stores views in format:
    /* Presto View: <base64-encoded-json> */

    The JSON contains an 'originalSql' field with the actual SQL.
    """
    try:
        # Extract base64 content from the Presto View comment
        match = re.search(r'/\* Presto View: ([A-Za-z0-9+/=]+) \*/', view_original_text)
        if not match:
            # Not a Presto view format, return as-is
            return view_original_text

        base64_content = match.group(1)

        # Decode base64
        decoded_bytes = base64.b64decode(base64_content)
        decoded_json = json.loads(decoded_bytes.decode('utf-8'))

        # Extract the original SQL
        original_sql = decoded_json.get('originalSql', view_original_text)
        return original_sql

    except Exception as e:
        logger.warning(f"Failed to decode Presto view: {str(e)}")
        return view_original_text


def lambda_handler(event, context):
    logger.info(mask_sensitive_data(event))

    try:
        body = json.loads(event["body"]) if "body" in event else json.loads(event)
        archive_id = body["archive_id"]

        # Get DynamoDB table name for archives
        archives_table_param = ssm.get_parameter(
            Name='/archive/dynamodb-table', WithDecryption=True)
        archives_table_name = archives_table_param['Parameter']['Value']

        # Fetch archive metadata from DynamoDB
        archive_response = dynamodb.get_item(
            TableName=archives_table_name,
            Key={'id': {'S': archive_id}}
        )

        if 'Item' not in archive_response:
            return build_response(404, json.dumps({
                "error": "Archive not found",
                "message": f"Archive with id {archive_id} does not exist"
            }))

        # Extract database name from archive
        archive_item = archive_response['Item']
        database_name = archive_item.get('database', {}).get('S', '')

        if not database_name:
            return build_response(400, json.dumps({
                "error": "Invalid archive",
                "message": "Archive does not have a database name"
            }))

        # Construct Glue database name
        glue_database_name = f'{archive_id}-{database_name}-database'

        logger.info(f"Fetching views from Glue database: {glue_database_name}")

        # Get all tables from Glue database
        views = []
        next_token = None

        while True:
            if next_token:
                response = glue.get_tables(
                    DatabaseName=glue_database_name,
                    NextToken=next_token
                )
            else:
                response = glue.get_tables(
                    DatabaseName=glue_database_name
                )

            # Filter for views only (TableType = 'VIRTUAL_VIEW')
            for table in response.get('TableList', []):
                if table.get('TableType') == 'VIRTUAL_VIEW':
                    raw_view_text = table.get('ViewOriginalText', '')
                    decoded_sql = decode_presto_view(raw_view_text)

                    # Clean up the SQL by removing archive_id and database prefixes
                    # Tables: "archive_id-database-database"."archive_id-database-public.table-table" -> public.table
                    # Views: "archive_id-database-database"."view_name" -> view_name
                    simplified_sql = decoded_sql

                    # Pattern 1: Replace tables that have the full prefix and -table suffix
                    # "86e1e4c1...-database"."86e1e4c1...-public.table_name-table" -> public.table_name
                    table_pattern = f'"{archive_id}-{database_name}-database"\\."{archive_id}-{database_name}-([^"]+)-table"'
                    simplified_sql = re.sub(table_pattern, r'\1', simplified_sql)

                    # Pattern 2: Replace database prefix for views (simple view names without archive prefix)
                    # "86e1e4c1...-database"."example_view" -> example_view
                    view_pattern = f'"{archive_id}-{database_name}-database"\\."([^"]+)"'
                    simplified_sql = re.sub(view_pattern, r'\1', simplified_sql)

                    view_info = {
                        'name': table.get('Name', ''),
                        'view_original_text': simplified_sql,
                        'view_expanded_text': table.get('ViewExpandedText', ''),
                        'created_time': table.get('CreateTime').isoformat() if table.get('CreateTime') else None,
                        'updated_time': table.get('UpdateTime').isoformat() if table.get('UpdateTime') else None,
                        'columns': [
                            {
                                'name': col.get('Name', ''),
                                'type': col.get('Type', ''),
                                'comment': col.get('Comment', '')
                            }
                            for col in table.get('StorageDescriptor', {}).get('Columns', [])
                        ]
                    }
                    views.append(view_info)

            next_token = response.get('NextToken')
            if not next_token:
                break

        logger.info(f"Found {len(views)} views in database {glue_database_name}")

        return build_response(200, json.dumps({
            "views": views,
            "database_name": glue_database_name,
            "count": len(views)
        }))

    except Exception as ex:
        logger.error(traceback.format_exc())
        return build_response(500, json.dumps({
            "error": "Internal server error",
            "message": str(ex)
        }))
