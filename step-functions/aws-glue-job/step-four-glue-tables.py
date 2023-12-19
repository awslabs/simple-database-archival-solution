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

REGION = os.getenv("REGION")
client = boto3.client('glue', region_name=REGION)
dynamodb = boto3.resource('dynamodb', region_name=REGION)
ssm = boto3.client('ssm')


def lambda_handler(event, context):

    # Get SSM Parameter for DynamoDB Table name
    parameter = ssm.get_parameter(
        Name='/archive/dynamodb-table', WithDecryption=True)

    # Get SSM Parameter for S3 Bucket name
    bucketParameter = ssm.get_parameter(
        Name='/job/s3-bucket-table-data', WithDecryption=True)
    table = dynamodb.Table(parameter['Parameter']['Value'])

    try:
        for tbl in event["Item"]["table_details"]:
            columns = []
            for schema in tbl["schema"]:
                print(schema)
                columns.append({'Name': schema["key"], 'Type': schema["value"],
                                'Comment': ''})
            try:
                client.get_table(
                    DatabaseName=f'{event["Item"]["id"]}-{event["Item"]["database"]}-database',
                    Name=f'{event["Item"]["id"]}-{event["Item"]["database"]}-{tbl["table"]}-table',
                )

            except:
                bucketName = bucketParameter['Parameter']['Value']
                client.create_table(
                    DatabaseName=f'{event["Item"]["id"]}-{event["Item"]["database"]}-database',
                    TableInput={
                        'Name': f'{event["Item"]["id"]}-{event["Item"]["database"]}-{tbl["table"]}-table',
                        'Description': 'TO ADD',
                        'StorageDescriptor': {
                            'Columns': columns,
                            'Location': f's3://{bucketName}/{event["Item"]["id"]}/{event["Item"]["database"]}/{tbl["table"]}',
                            'InputFormat': 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
                            'OutputFormat': 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
                            'Compressed': False,
                            'SerdeInfo': {'SerializationLibrary': 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'}
                        },
                        'TableType': "EXTERNAL_TABLE",
                        'Parameters': {
                            'classification': 'parquet',
                            'typeOfData': 'file',
                        }
                    }
                )
            tbl["archive_id"] = event["Item"]["id"]
            tbl["database"] = event["Item"]["database"]
            tbl["database_engine"] = event["Item"]["database_engine"]
            tbl["oracle_owner"] = event["Item"]["oracle_owner"]
            tbl["oracle_owner"] = event["Item"]["oracle_owner"]
            tbl["glue_capacity"] = event["Item"]["configuration"]["glue"]["glue_capacity"]
            tbl["glue_worker"] = event["Item"]["configuration"]["glue"]["glue_worker"]

    except:
        table.update_item(
            Key={'id': event["Item"]["id"]},
            UpdateExpression="SET archive_status= :s",
            ExpressionAttributeValues={':s': 'Failed'},
            ReturnValues="UPDATED_NEW"
        )
        raise

    return {"Payload": event["Item"]["table_details"]}
