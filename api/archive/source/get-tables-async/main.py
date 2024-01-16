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
import time
import json
import uuid
import logging
import os
import traceback

BACKGROUND_FUNCTION = os.getenv("BACKGROUND_FUNCTION")
DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE")
dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()

if logger.hasHandlers():
    logger.setLevel(LOG_LEVEL)
else:
    logging.basicConfig(level=LOG_LEVEL)


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
            "Cache-Control": "no-cache, no-store",  # tell cloudfront and api gateway not to cache the response
            "Content-Type": "application/json",
        },
        "statusCode": http_code,
        "body": body,
    }


def insert_into_dynamodb(data):
    table = dynamodb.Table(DYNAMODB_TABLE)
    job_id = str(uuid.uuid4())

    # Adding TTL (Time to Live) attribute
    ttl = int(time.time()) + 86400  # 24 hours

    item = {
        "id": job_id,
        "job_id": job_id,
        "status": "Pending",
        "data": data,
        "ttl": ttl,
    }
    table.put_item(Item=item)
    return job_id


def invoke_background_function(job_id, data):
    payload = {
        'job_id': job_id,
        'data': data
    }
    lambda_client.invoke(
        FunctionName=BACKGROUND_FUNCTION,
        InvocationType="Event",  # Asynchronous invocation
        Payload=json.dumps(payload)
    )


def lambda_handler(event, context):
    logger.info(mask_sensitive_data(event))
    body = json.loads(event["body"]) if "body" in event else json.loads(event)

    try:
        job_id = insert_into_dynamodb(body)

        # Invoke the background processing function
        invoke_background_function(job_id, body)

        # Return the job ID to the client
        response = {"job_id": job_id, "message": "Processing started"}
        return build_response(200, json.dumps(response))

    except Exception as ex:
        logger.error(traceback.format_exc())
        return build_response(500, "Server Error")


if __name__ == "__main__":
    example_event = {}
    response = lambda_handler(example_event, {})
