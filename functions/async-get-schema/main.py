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
import logging
import os
import traceback
import boto3
from lib import mysql
from lib import mssql
from lib import oracle
from lib import postgresql

REGION = os.getenv("REGION")
DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE")
dynamodb = boto3.resource('dynamodb')

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


def update_dynamodb(job_id, status, tables=None):
    table = dynamodb.Table(DYNAMODB_TABLE)
    update_expression = "SET #st = :s"
    expression_attribute_values = {":s": status}
    expression_attribute_names = {"#st": "status"}

    if tables is not None:
        update_expression += ", #tbl = :t"
        expression_attribute_values[":t"] = tables
        expression_attribute_names["#tbl"] = "tables"

    table.update_item(
        Key={"id": job_id},
        UpdateExpression=update_expression,
        ExpressionAttributeValues=expression_attribute_values,
        ExpressionAttributeNames=expression_attribute_names
    )


def lambda_handler(event, context):
    logger.info(mask_sensitive_data(event))

    job_id = event.get("job_id")

    try:

        data = event.get("data")

        # Start processing
        update_dynamodb(job_id, "In Progress")

        # Database connection and data fetching logic
        hostname = data["hostname"]
        port = data["port"]
        username = data["username"]
        password = data["password"]
        database = data["database"]
        database_engine = data["database_engine"]

        tables = []

        if database_engine == "oracle":
            oracle_owner = data["oracle_owner"]
            oracle_owner_list = oracle_owner.split(",")

            for owner in oracle_owner_list:
                oracle_connection = oracle.Connection(hostname, port, username, password, database, owner)
                tables_connection = oracle_connection.get_schema()
                for table in tables_connection:
                    table["oracle_owner"] = owner
                    tables.append(table)

        elif database_engine == "mysql":
            connection = mysql.Connection(hostname, port, username, password, database)
            tables = connection.get_schema()

        elif database_engine == "mssql":
            connection = mssql.Connection(hostname, port, username, password, database)
            tables = connection.get_schema()

        elif database_engine == "postgresql":
            connection = postgresql.Connection(hostname, port, username, password, database)
            tables = connection.get_schema()

        # Update DynamoDB with the results
        update_dynamodb(job_id, "Completed", tables)

    except Exception as ex:
        logger.error(traceback.format_exc())
        # Update DynamoDB with the error status
        update_dynamodb(job_id, "Failed")
        return {"statusCode": 500, "body": json.dumps({"message": "Server Error"})}

    return {"statusCode": 200, "body": json.dumps({"message": "Processing completed"})}
