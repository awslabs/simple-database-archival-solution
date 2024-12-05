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
import os

REGION = os.getenv("REGION")

client = boto3.client("athena")
sqs = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb', region_name=REGION)
ssm = boto3.client('ssm')


# Get Athena Response
def get_athena_response(query_execution_id):
    response = client.get_query_results(
        QueryExecutionId=query_execution_id,
        MaxResults=123
    )
    return response


# Set Job State Function
def update_validation_state(archive_id, query_execution_id, table_name, validation_type, athena_response, query,
                            status_message):
    parameter = ssm.get_parameter(
        Name='/archive/dynamodb-table', WithDecryption=True)
    table = dynamodb.Table(parameter['Parameter']['Value'])
    dynamodb_response = table.get_item(Key={"id": archive_id})

    sqs_parameter = ssm.get_parameter(
        Name='/sqs/validation', WithDecryption=True)
    sqs_parameter_value = sqs_parameter['Parameter']['Value']
    print(sqs_parameter_value)

    for index, item in enumerate(dynamodb_response["Item"]["table_details"]):
        if item["table"] == table_name:
            table.update_item(
                Key={'id': archive_id},
                UpdateExpression=f'set table_details[{index}].{validation_type} = :newJob',
                ExpressionAttributeValues={
                    ':newJob': {
                        "query_execution_id": query_execution_id,
                        "query": query,
                        "state": status_message,
                        "results": athena_response["ResultSet"]["Rows"]
                    }
                }
            )

    # Send message to SQS queue
    message = {"archive_id": archive_id}
    response = sqs.send_message(
        QueueUrl=str(sqs_parameter_value),
        MessageGroupId=archive_id,
        MessageDeduplicationId=str(query_execution_id),
        MessageBody=json.dumps(message)
    )
    print(response)


def get_archive(query_execution_id):
    parameter = ssm.get_parameter(
        Name='/archive/query-lookup-dynamodb-table', WithDecryption=True)

    table = dynamodb.Table(parameter['Parameter']['Value'])
    dynamodb_response = table.get_item(Key={"id": query_execution_id})
    archive_id = dynamodb_response["Item"]["archive_id"]
    table_name = dynamodb_response["Item"]["table_name"]
    validation_type = dynamodb_response["Item"]["validation_type"]
    query = dynamodb_response["Item"]["query"]

    return archive_id, table_name, validation_type, query


def lambda_handler(event, context):
    archive_id, table_name, validation_type, query = get_archive(
        event["detail"]["queryExecutionId"])
    athena_response = get_athena_response(event["detail"]["queryExecutionId"])

    if event["detail"]["currentState"] == "SUCCEEDED":

        update_validation_state(
            archive_id,
            event["detail"]["queryExecutionId"],
            table_name,
            validation_type,
            athena_response,
            query,
            "SUCCEEDED"
        )
    elif event["detail"]["currentState"] == "FAILED":
        parameter = ssm.get_parameter(
            Name='/archive/dynamodb-table', WithDecryption=True)
        table = dynamodb.Table(parameter['Parameter']['Value'])
        table.update_item(
            Key={'id': archive_id},
            UpdateExpression="SET archive_status= :s",
            ExpressionAttributeValues={':s': 'Failed'},
            ReturnValues="UPDATED_NEW"
        )
    print(event["detail"]["currentState"])
    return event
