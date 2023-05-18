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
from botocore.config import Config

REGION = os.environ["REGION"]

client = boto3.client('glue', region_name=REGION, config=Config(
    connect_timeout=5, read_timeout=60, retries={'max_attempts': 20}))
dynamodb = boto3.resource('dynamodb', region_name=REGION)
ssm = boto3.client('ssm')


def lambda_handler(event, context):

    # Get SSM Parameter for DynamoDB Table name
    bucket_parm = ssm.get_parameter(
        Name='/glue/s3-bucket-glue-assets', WithDecryption=True)
    temp_glue_bucket_parm = ssm.get_parameter(
        Name='/glue/temp-dir', WithDecryption=True)
    aws_glue_role = ssm.get_parameter(
        Name='/glue/glue-role', WithDecryption=True)

    try:
        if event["database_engine"] == "mysql":
            client.create_job(
                Name=f'{event["archive_id"]}-{event["database"]}-{event["table"]}',
                Role=aws_glue_role["Parameter"]["Value"],
                Command={
                    'Name': 'glueetl',
                    'ScriptLocation': f's3://{bucket_parm["Parameter"]["Value"]}/scripts/mysql-1-0-0.py',
                    'PythonVersion': '3'
                },
                DefaultArguments={
                    '--TempDir': f's3://{temp_glue_bucket_parm["Parameter"]["Value"]}/temp/',
                    '--job-bookmark-option': 'job-bookmark-disable'
                },
                MaxRetries=0,
                GlueVersion='3.0',
                NumberOfWorkers=int(event["glue_capacity"]),
                WorkerType=event["glue_worker"],
                Connections={
                    'Connections': [
                        f'{event["archive_id"]}-{event["database"]}-connection',
                    ]
                }
            )
        elif event["database_engine"] == "mssql":
            response = client.create_job(
                Name=f'{event["archive_id"]}-{event["database"]}-{event["table"]}',
                Role=aws_glue_role["Parameter"]["Value"],
                Command={
                    'Name': 'glueetl',
                    'ScriptLocation': f's3://{bucket_parm["Parameter"]["Value"]}/scripts/mssql-1-0-0.py',
                    'PythonVersion': '3'
                },
                DefaultArguments={
                    '--TempDir': f's3://{temp_glue_bucket_parm["Parameter"]["Value"]}/temp/',
                    '--job-bookmark-option': 'job-bookmark-disable',
                    '--disable-proxy-v2': 'true'
                },
                MaxRetries=0,
                GlueVersion='3.0',
                NumberOfWorkers=int(event["glue_capacity"]),
                WorkerType=event["glue_worker"],
                Connections={
                    'Connections': [
                        f'{event["archive_id"]}-{event["database"]}-connection',
                    ]
                }
            )
        elif event["database_engine"] == "oracle":
            client.create_job(
                Name=f'{event["archive_id"]}-{event["database"]}-{event["table"]}',
                Role=aws_glue_role["Parameter"]["Value"],
                Command={
                    'Name': 'glueetl',
                    'ScriptLocation': f's3://{bucket_parm["Parameter"]["Value"]}/scripts/oracle-1-0-4.py',
                    'PythonVersion': '3'
                },
                DefaultArguments={
                    '--TempDir': f's3://{temp_glue_bucket_parm["Parameter"]["Value"]}/temp/',
                    '--job-bookmark-option': 'job-bookmark-disable'
                },
                MaxRetries=0,
                GlueVersion='3.0',
                NumberOfWorkers=int(event["glue_capacity"]),
                WorkerType=event["glue_worker"],
                Connections={
                    'Connections': [
                        f'{event["archive_id"]}-{event["database"]}-connection',
                    ]
                }
            )
        elif event["database_engine"] == "postgresql":
            response = client.create_job(
                Name=f'{event["archive_id"]}-{event["database"]}-{event["table"]}',
                Role=aws_glue_role["Parameter"]["Value"],
                Command={
                    'Name': 'glueetl',
                    'ScriptLocation': f's3://{bucket_parm["Parameter"]["Value"]}/scripts/postgresql-1-0-0.py',
                    'PythonVersion': '3'
                },
                DefaultArguments={
                    '--TempDir': f's3://{temp_glue_bucket_parm["Parameter"]["Value"]}/temp/',
                    '--job-bookmark-option': 'job-bookmark-disable',
                    '--disable-proxy-v2': 'true'
                },
                MaxRetries=0,
                GlueVersion='3.0',
                NumberOfWorkers=int(event["glue_capacity"]),
                WorkerType=event["glue_worker"],
                Connections={
                    'Connections': [
                        f'{event["archive_id"]}-{event["database"]}-connection',
                    ]
                }
            )

    except Exception as ex:
        print(ex)
        print('error')
        raise

    # table.update_item(
    #     Key={'id': event["Item"]["id"]},
    #     UpdateExpression="SET archive_status= :s",
    #     ExpressionAttributeValues={':s': 'Failed'},
    #     ReturnValues="UPDATED_NEW"
    # )

    return {"Payload": event}
