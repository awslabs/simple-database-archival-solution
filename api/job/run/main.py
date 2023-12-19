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

import boto3
import json
import logging
import os
import traceback
import uuid

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
client = boto3.client('stepfunctions')
dynamodb = boto3.resource('dynamodb', region_name=REGION)

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

    try:

        body = json.loads(
            event["body"]) if "body" in event else json.loads(event)
        archive_id = body["archive_id"]
        worker_capacity = body["worker_capacity"]
        worker_type = body["worker_type"]
        run_now = body["archive_schedule"]["run_now"]

        parameter = ssm.get_parameter(
            Name='/archive/dynamodb-table', WithDecryption=True)
        table = dynamodb.Table(parameter['Parameter']['Value'])

        # Update Worker Capacity based on User Choice
        table.update_item(
            Key={'id': archive_id},
            UpdateExpression="SET configuration.glue.glue_capacity= :s",
            ExpressionAttributeValues={':s': worker_capacity},
            ReturnValues="UPDATED_NEW"
        )

        # Update Worker Capacity based on User Choice
        table.update_item(
            Key={'id': archive_id},
            UpdateExpression="SET configuration.glue.glue_worker= :s",
            ExpressionAttributeValues={':s': worker_type},
            ReturnValues="UPDATED_NEW"
        )

        parameter = ssm.get_parameter(
            Name='/job/step-functions-state-machine', WithDecryption=True)

        input_value = {
            "archive_id": archive_id
        }

        if run_now:
            response = client.start_execution(
                stateMachineArn=parameter['Parameter']['Value'],
                name=str(uuid.uuid4()),
                input=json.dumps(input_value),
            )
            table.update_item(
                Key={'id': archive_id},
                UpdateExpression="SET archive_status= :s",
                ExpressionAttributeValues={':s': "Archiving"},
                ReturnValues="UPDATED_NEW"
            )
        else:
            print("ADD SCHEDULER")

        response = {"RequestId": response["ResponseMetadata"]["RequestId"]}
        return build_response(200, json.dumps(response))

    except Exception as ex:
        logger.error(traceback.format_exc())
        return build_response(500, "Server Error")


if __name__ == "__main__":

    example_event = {}
    response = lambda_handler(example_event, {})
    print(json.dumps(response))
