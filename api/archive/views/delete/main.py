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

REGION = os.getenv("REGION")

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


def lambda_handler(event, context):
    """
    Lambda handler for deleting a view from an archive.
    """
    logger.info(mask_sensitive_data(event))

    try:
        body = json.loads(event["body"]) if "body" in event else json.loads(event)
        archive_id = body["archive_id"]
        view_name = body["view_name"]

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

        logger.info(f"Deleting view '{view_name}' from Glue database: {glue_database_name}")

        # Delete the view (table) from Glue catalog
        try:
            glue.delete_table(
                DatabaseName=glue_database_name,
                Name=view_name
            )

            logger.info(f"Successfully deleted view: {view_name}")

            return build_response(200, json.dumps({
                "message": f"View '{view_name}' successfully deleted",
                "view_name": view_name,
                "database": glue_database_name
            }))

        except glue.exceptions.EntityNotFoundException:
            return build_response(404, json.dumps({
                "error": "View not found",
                "message": f"View '{view_name}' does not exist in database '{glue_database_name}'"
            }))

    except KeyError as ke:
        logger.error(f"Missing required parameter: {str(ke)}")
        return build_response(400, json.dumps({
            "error": "Bad request",
            "message": f"Missing required parameter: {str(ke)}"
        }))
    except Exception as ex:
        logger.error(traceback.format_exc())
        return build_response(500, json.dumps({
            "error": "Internal server error",
            "message": str(ex)
        }))
