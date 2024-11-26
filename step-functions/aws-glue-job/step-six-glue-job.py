"""
Copyright 2024 Amazon.com, Inc. and its affiliates. All Rights Reserved.

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
import os
from botocore.config import Config

REGION = os.environ["REGION"]
ARTIFACT_BUCKET_NAME = os.environ["ARTIFACT_BUCKET_NAME"]
TEMP_GLUE_BUCKET_NAME = os.environ["TEMP_GLUE_BUCKET_NAME"]
AWS_GLUE_ROLE = os.environ["AWS_GLUE_ROLE"]

client = boto3.client('glue', region_name=REGION, config=Config(
    connect_timeout=5, read_timeout=60, retries={'max_attempts': 20}))
dynamodb = boto3.resource('dynamodb', region_name=REGION)


def lambda_handler(event, context):
    try:
        if event["database_engine"] == "mysql":
            client.create_job(
                Name=f'{event["archive_id"]}-{event["database"]}-{event["table"]}',
                Role=AWS_GLUE_ROLE,
                Command={
                    'Name': 'glueetl',
                    'ScriptLocation': f's3://{ARTIFACT_BUCKET_NAME}/scripts/mysql-1-0-0.py',
                    'PythonVersion': '3'
                },
                DefaultArguments={
                    '--TempDir': f's3://{TEMP_GLUE_BUCKET_NAME}/temp/',
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
            client.create_job(
                Name=f'{event["archive_id"]}-{event["database"]}-{event["table"]}',
                Role=AWS_GLUE_ROLE,
                Command={
                    'Name': 'glueetl',
                    'ScriptLocation': f's3://{ARTIFACT_BUCKET_NAME}/scripts/mssql-1-0-0.py',
                    'PythonVersion': '3'
                },
                DefaultArguments={
                    '--TempDir': f's3://{TEMP_GLUE_BUCKET_NAME}/temp/',
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
                Role=AWS_GLUE_ROLE,
                Command={
                    'Name': 'glueetl',
                    'ScriptLocation': f's3://{ARTIFACT_BUCKET_NAME}/scripts/oracle-1-0-4.py',
                    'PythonVersion': '3'
                },
                DefaultArguments={
                    '--TempDir': f's3://{TEMP_GLUE_BUCKET_NAME}/temp/',
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
            client.create_job(
                Name=f'{event["archive_id"]}-{event["database"]}-{event["table"]}',
                Role=AWS_GLUE_ROLE,
                Command={
                    'Name': 'glueetl',
                    'ScriptLocation': f's3://{ARTIFACT_BUCKET_NAME}/scripts/postgresql-1-0-0.py',
                    'PythonVersion': '3'
                },
                DefaultArguments={
                    '--TempDir': f's3://{TEMP_GLUE_BUCKET_NAME}/temp/',
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

    return {"Payload": event}
