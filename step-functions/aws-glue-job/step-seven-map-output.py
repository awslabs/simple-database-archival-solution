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
import os

REGION = os.environ["REGION"]

payload = {"Payload": []}
dynamodb = boto3.resource('dynamodb', region_name=REGION)
ssm = boto3.client('ssm')


def lambda_handler(event, context):

    # Get SSM Parameter for DynamoDB Table name
    parameter = ssm.get_parameter(
        Name='/archive/dynamodb-table', WithDecryption=True)

    table = dynamodb.Table(parameter['Parameter']['Value'])

    try:

        for tbl in event:
            payload["Payload"].append(
                {"archive_id": tbl["Payload"]["archive_id"],
                 "table": tbl["Payload"]["table"],
                 "database": tbl["Payload"]["database"],
                 "table_details": tbl["Payload"]["schema"],
                 "database_engine": tbl["Payload"]["database_engine"],
                 "mssql_schema": tbl["Payload"]["mssql_schema"] if "mssql_schema" in tbl["Payload"] else None,
                 "oracle_owner": tbl["Payload"]["oracle_owner"] if "oracle_owner" in tbl["Payload"] else None,
                 })

    except Exception as ex:
        print(ex)
        print('error')
        raise

    return payload
