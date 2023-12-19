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
CLIENT = boto3.client("athena")
ssm = boto3.client('ssm')
dynamodb = boto3.resource('dynamodb', region_name=REGION)

def count_validation(ARCHIVE_ID, DATABASE_NAME, TABLE_NAME, TABLE_INDEX):
    
    parameter = ssm.get_parameter(
        Name='/archive/dynamodb-table', WithDecryption=True)
    query_parameter = ssm.get_parameter(
        Name='/archive/query-lookup-dynamodb-table', WithDecryption=True)
    athena_bucket_parameter = ssm.get_parameter(
        Name='/athena/s3-athena-temp-bucket', WithDecryption=True)

    table = dynamodb.Table(parameter['Parameter']['Value'])
    query_table = dynamodb.Table(query_parameter['Parameter']['Value'])
    
    athena_bucket_value = athena_bucket_parameter['Parameter']['Value']
    
    # START Count Validation
    try:

        query = "SELECT COUNT(*) from \"" + ARCHIVE_ID + "-" + DATABASE_NAME + \
                "-database\".\"" + ARCHIVE_ID + "-" + \
            DATABASE_NAME + "-" + TABLE_NAME + "-table\""

        response = CLIENT.start_query_execution(
            QueryString=query,
            ResultConfiguration={"OutputLocation": f's3://{athena_bucket_value}/queries/'}
        )

        # Create lookup for queries from QueryExecutionId to Archive ID
        query_table.put_item(
            Item={
                "id": response["QueryExecutionId"],
                "archive_id": ARCHIVE_ID,
                "table_name": TABLE_NAME,
                "validation_type": "count_validation",
                "query": query
            })

        # Add validation to archive record
        table.update_item(
            Key={'id': ARCHIVE_ID},
            UpdateExpression=f'set table_details[{TABLE_INDEX}].count_validation = :newJob',
            ExpressionAttributeValues={
                ':newJob': {
                    "query_execution_id": response["QueryExecutionId"],
                    "state": "RUNNING",
                    "query": query,
                    "results": []
                }
            }
        )
        
        return response
        
    except Exception as ex:
        print("error")
        print(ex)


def lambda_handler(event, context):
    
    TABLE_NAME = event["table"]
    DATABASE_NAME = event["database"]
    ARCHIVE_ID = event["archive_id"]
    
    parameter = ssm.get_parameter(
        Name='/archive/dynamodb-table', WithDecryption=True)

    table = dynamodb.Table(parameter['Parameter']['Value'])
    dynamodb_response = table.get_item(Key={"id": ARCHIVE_ID})

	# Count Validation
    for index, item in enumerate(dynamodb_response["Item"]["table_details"]):
        if item["table"] == TABLE_NAME:
            count_validation(ARCHIVE_ID, DATABASE_NAME, TABLE_NAME, index)
            
    return event