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
from lib import mysql
from lib import mssql
from lib import oracle
from lib import postgresql


# region Logging

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()

if logger.hasHandlers():
    logger.setLevel(LOG_LEVEL)
else:
    logging.basicConfig(level=LOG_LEVEL)

# endregion

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
    return result;    

def build_response(http_code, body):
    return {
        "headers": {
            "Cache-Control": "no-cache, no-store", # tell cloudfront and api gateway not to cache the response
            "Content-Type": "application/json",
        },
        "statusCode": http_code,
        "body": body,
    }


def lambda_handler(event, context):
    logger.info(mask_sensitive_data(event))
    body = json.loads(event["body"]) if "body" in event else json.loads(event)
    
    hostname = body["hostname"]
    port = body["port"]
    username = body["username"]
    password = body["password"]
    database = body["database"]
    schema = body["schema"]
    database_engine = body["database_engine"]
    
    if database_engine == "oracle":
        oracle_owner = body["oracle_owner"]
        oracle_owner_list = oracle_owner.split(",")
        
        try:
            tables = []
            for owner in oracle_owner_list:
                oracle_connection = oracle.Connection(hostname,
                                                    port,
                                                    username,
                                                    password,
                                                    database,
                                                    owner)
                tables_connection = oracle_connection.get_schema()
                for table in tables_connection:
                    table["oracle_owner"] = owner
                    tables.append(table) 
            response = {"tables": tables}
            return build_response(200, json.dumps(response))
        
        except Exception as ex:
            logger.error(traceback.format_exc())
            return build_response(500, "Server Error")
        
    elif database_engine == "mysql":
        connection = mysql.Connection(hostname,
                                    port,
                                    username,
                                    password,
                                    database,)
        
        try:
            tables = connection.get_schema()
            response = {"tables": tables}
            return build_response(200, json.dumps(response))
        except Exception as ex:
            logger.error(traceback.format_exc())
            return build_response(500, "Server Error")
    
    elif database_engine == "mssql":
        connection = mssql.Connection(hostname,
                                    port,
                                    username,
                                    password,
                                    database,)
        
        try:
            tables = connection.get_schema()
            response = {"tables": tables}
            return build_response(200, json.dumps(response))
        except Exception as ex:
            logger.error(traceback.format_exc())
            return build_response(500, "Server Error")
        
    elif database_engine == "postgresql":
        connection = postgresql.Connection(hostname,
                                    port,
                                    username,
                                    password,
                                    database,
                                    schema,)
        
        try:
            tables = connection.get_schema()
            response = {"tables": tables}
            return build_response(200, json.dumps(response))
        except Exception as ex:
            logger.error(traceback.format_exc())
            return build_response(500, "Server Error")


if __name__ == "__main__":
    example_event = {}
    response = lambda_handler(example_event, {})