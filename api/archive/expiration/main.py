""" 
Copyright 2023 Amazon.com, Inc. and its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at

  http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License.
"""


import json
import boto3
import logging
import os
import traceback
from datetime import datetime

REGION = os.getenv("REGION")

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


ssm = boto3.client('ssm')
client = boto3.client('s3')


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

    dynamodb = boto3.resource('dynamodb', region_name=REGION)

    body = json.loads(
        event["body"]) if "body" in event else json.loads(event)
    archive_id = body["archive_id"]
    expiration_status = body["expiration_status"]
    expiration_date = body["expiration_date"]
    delete_data = body["delete_data"]
    folder_paths = [archive_id]
    expiration = expiration_date

    bucket_parameter = ssm.get_parameter(
        Name='/job/s3-bucket-table-data', WithDecryption=True)

    bucket_name = bucket_parameter['Parameter']['Value']

    parameter = ssm.get_parameter(
        Name='/archive/dynamodb-table', WithDecryption=True)
    table = dynamodb.Table(parameter['Parameter']['Value'])

    try:
            
        if delete_data is True:
            for folder_path in folder_paths:

                client.put_bucket_lifecycle_configuration(
                    Bucket=bucket_name,
                    LifecycleConfiguration={
                        'Rules': [
                            {
                                'Expiration': {
                                    'Date': datetime.strptime(expiration, '%Y-%m-%d')
                                },
                                'ID': folder_path,
                                'Filter': {
                                    'Prefix': folder_path + "/"
                                },
                                'Status': 'Enabled'
                            }
                        ]
                    }
                )
            table.update_item(
                Key={'id': archive_id},
                UpdateExpression="SET delete_data= :s",
                ExpressionAttributeValues={':s': True},
                ReturnValues="UPDATED_NEW"
            )
        elif delete_data is False:
            if delete_data is False:
                for folder_path in folder_paths:

                    client.put_bucket_lifecycle_configuration(
                        Bucket=bucket_name,
                        LifecycleConfiguration={
                            'Rules': [
                                {
                                    'Expiration': {
                                        'Date': datetime.strptime(expiration, '%Y-%m-%d')
                                    },
                                    'ID': folder_path,
                                    'Filter': {
                                        'Prefix': folder_path + "/"
                                    },
                                    'Status': 'Disabled'
                                }
                            ]
                        }
                    )
                table.update_item(
                    Key={'id': archive_id},
                    UpdateExpression="SET delete_data= :s",
                    ExpressionAttributeValues={':s': False},
                    ReturnValues="UPDATED_NEW"
                )

        if expiration_status == "Enabled":

            table.update_item(
                Key={'id': archive_id},
                UpdateExpression="SET expiration_status= :s",
                ExpressionAttributeValues={':s': True},
                ReturnValues="UPDATED_NEW"
            )
            table.update_item(
                Key={'id': archive_id},
                UpdateExpression="SET expiration_date= :s",
                ExpressionAttributeValues={':s': expiration_date},
                ReturnValues="UPDATED_NEW"
            )
        elif expiration_status == "Disabled":

            table.update_item(
                Key={'id': archive_id},
                UpdateExpression="SET expiration_status= :s",
                ExpressionAttributeValues={':s': False},
                ReturnValues="UPDATED_NEW"
            )
            table.update_item(
                Key={'id': archive_id},
                UpdateExpression="SET expiration_date= :s",
                ExpressionAttributeValues={':s': ""},
                ReturnValues="UPDATED_NEW"
            )

        response = {"expiration_status": expiration_status}
        return build_response(200, json.dumps(response))

    except Exception:
        logger.error(traceback.format_exc())
        return build_response(500, "Server Error")


if __name__ == "__main__":

    example_event = {}
    response = lambda_handler(example_event, {})
    print(json.dumps(response))
