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
    database = f'{body["archive_id"]}-bikestores-database'

    query_state_running = True

    try:

        parameter = ssm.get_parameter(
            Name='/athena/s3-athena-temp-bucket', WithDecryption=True)
        bucket_path = parameter['Parameter']['Value']

        response = client.start_query_execution(
            QueryString=sql_statement,
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
