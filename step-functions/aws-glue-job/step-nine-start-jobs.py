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
from botocore.config import Config
import json
import os

REGION = os.environ["REGION"]

client = boto3.client(
    "glue",
    region_name=REGION,
    config=Config(connect_timeout=5, read_timeout=60,
                  retries={"max_attempts": 20}),
)
dynamodb = boto3.resource("dynamodb", region_name=REGION)
ssm = boto3.client("ssm")


def adjust_data_type(data_type):
    if data_type.lower() == 'array<string>':
        return 'array'
    return data_type


def lambda_handler(event, context):
    bucketParameter = ssm.get_parameter(
        Name="/job/s3-bucket-table-data", WithDecryption=True
    )
    parameter = ssm.get_parameter(
        Name="/archive/dynamodb-table", WithDecryption=True)
    temp_dir_parameter = ssm.get_parameter(
        Name="/glue/temp-dir", WithDecryption=True)

    table = dynamodb.Table(parameter["Parameter"]["Value"])
    temp_dir_parameter_value = temp_dir_parameter["Parameter"]["Value"]
    dynamodb_response = table.get_item(Key={"id": event["archive_id"]})

    try:

        mappings = []

        for schema in event["table_details"]:
            value = adjust_data_type(schema["value"])
            mappings.append(
                [schema["key"], value, schema["key"], value]
            )

        if event["database_engine"] == "mysql":
            response = client.start_job_run(
                JobName=f'{event["archive_id"]}-{event["database"]}-{event["table"]}',
                Arguments={
                    "--job-language": "python",
                    "--job-bookmark-option": "job-bookmark-disable",
                    "--TempDir": f"s3://{temp_dir_parameter_value}/temporary/",
                    "--enable-job-insights": "false",
                    "--TABLE": event["table"],
                    "--BUCKET": bucketParameter["Parameter"]["Value"],
                    "--DATABASE": event["database"],
                    "--ARCHIVE_ID": event["archive_id"],
                    "--CONNECTION": f'{event["archive_id"]}-{event["database"]}-connection',
                    "--MAPPINGS": json.dumps(mappings),
                },
                Timeout=2880,
                WorkerType=dynamodb_response["Item"]["configuration"]["glue"][
                    "glue_worker"
                ],
                NumberOfWorkers=int(
                    dynamodb_response["Item"]["configuration"]["glue"]["glue_capacity"]
                ),
            )

            table.update_item(
                Key={"id": event["archive_id"]},
                UpdateExpression=f'set jobs.{response["JobRunId"]} = :newJob',
                ExpressionAttributeValues={
                    ":newJob": {
                        "job_run_id": response["JobRunId"],
                        "state": "RUNNING",
                        "timestamp": response["ResponseMetadata"]["HTTPHeaders"][
                            "date"
                        ],
                        "message": "",
                    }
                },
            )
        elif event["database_engine"] == "mssql":
            response = client.start_job_run(
                JobName=f'{event["archive_id"]}-{event["database"]}-{event["table"]}',
                Arguments={
                    "--job-language": "python",
                    "--job-bookmark-option": "job-bookmark-disable",
                    "--TempDir": f"s3://{temp_dir_parameter_value}/temporary/",
                    "--enable-job-insights": "false",
                    "--TABLE": event["table"],
                    "--MSSQL_SCHEMA": event["mssql_schema"],
                    "--BUCKET": bucketParameter["Parameter"]["Value"],
                    "--DATABASE": event["database"],
                    "--ARCHIVE_ID": event["archive_id"],
                    "--CONNECTION": f'{event["archive_id"]}-{event["database"]}-connection',
                    "--MAPPINGS": json.dumps(mappings),
                },
                Timeout=2880,
                WorkerType=dynamodb_response["Item"]["configuration"]["glue"][
                    "glue_worker"
                ],
                NumberOfWorkers=int(
                    dynamodb_response["Item"]["configuration"]["glue"]["glue_capacity"]
                ),
            )

            table.update_item(
                Key={"id": event["archive_id"]},
                UpdateExpression=f'set jobs.{response["JobRunId"]} = :newJob',
                ExpressionAttributeValues={
                    ":newJob": {
                        "job_name": f'{event["archive_id"]}-{event["database"]}-{event["table"]}',
                        "job_run_id": response["JobRunId"],
                        "state": "RUNNING",
                        "timestamp": response["ResponseMetadata"]["HTTPHeaders"][
                            "date"
                        ],
                    }
                },
            )

        elif event["database_engine"] == "oracle":
            response = client.start_job_run(
                JobName=f'{event["archive_id"]}-{event["database"]}-{event["table"]}',
                Arguments={
                    "--job-language": "python",
                    "--job-bookmark-option": "job-bookmark-disable",
                    "--TempDir": f"s3://{temp_dir_parameter_value}/temporary/",
                    "--enable-job-insights": "false",
                    "--OWNER": event["oracle_owner"],
                    "--TABLE": event["table"],
                    "--BUCKET": bucketParameter["Parameter"]["Value"],
                    "--DATABASE": event["database"],
                    "--CONNECTION": f'{event["archive_id"]}-{event["database"]}-connection',
                    "--ARCHIVE_ID": event["archive_id"],
                    "--MAPPINGS": json.dumps(mappings),
                },
                Timeout=2880,
                WorkerType=dynamodb_response["Item"]["configuration"]["glue"][
                    "glue_worker"
                ],
                NumberOfWorkers=int(
                    dynamodb_response["Item"]["configuration"]["glue"]["glue_capacity"]
                ),
            )

            table.update_item(
                Key={"id": event["archive_id"]},
                UpdateExpression=f'set jobs.{response["JobRunId"]} = :newJob',
                ExpressionAttributeValues={
                    ":newJob": {
                        "job_run_id": response["JobRunId"],
                        "state": "RUNNING",
                        "timestamp": response["ResponseMetadata"]["HTTPHeaders"][
                            "date"
                        ],
                        "message": "",
                    }
                },
            )

        elif event["database_engine"] == "postgresql":
            response = client.start_job_run(
                JobName=f'{event["archive_id"]}-{event["database"]}-{event["table"]}',
                Arguments={
                    "--job-language": "python",
                    "--job-bookmark-option": "job-bookmark-disable",
                    "--TempDir": f"s3://{temp_dir_parameter_value}/temporary/",
                    "--enable-job-insights": "false",
                    "--TABLE": event["table"],
                    "--BUCKET": bucketParameter["Parameter"]["Value"],
                    "--DATABASE": event["database"],
                    "--ARCHIVE_ID": event["archive_id"],
                    "--CONNECTION": f'{event["archive_id"]}-{event["database"]}-connection',
                    "--MAPPINGS": json.dumps(mappings),
                },
                Timeout=2880,
                WorkerType=dynamodb_response["Item"]["configuration"]["glue"][
                    "glue_worker"
                ],
                NumberOfWorkers=int(
                    dynamodb_response["Item"]["configuration"]["glue"]["glue_capacity"]
                ),
            )

            table.update_item(
                Key={"id": event["archive_id"]},
                UpdateExpression=f'set jobs.{response["JobRunId"]} = :newJob',
                ExpressionAttributeValues={
                    ":newJob": {
                        "job_name": f'{event["archive_id"]}-{event["database"]}-{event["table"]}',
                        "job_run_id": response["JobRunId"],
                        "state": "RUNNING",
                        "timestamp": response["ResponseMetadata"]["HTTPHeaders"][
                            "date"
                        ],
                    }
                },
            )
    except Exception as ex:
        print(ex)
        print("error")
        raise

    # table.update_item(
    #     Key={'id': event["Item"]["id"]},
    #     UpdateExpression="SET archive_status= :s",
    #     ExpressionAttributeValues={':s': 'Failed'},
    #     ReturnValues="UPDATED_NEW"
    # )

    return {"Payload": event}
