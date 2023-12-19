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
ssm = boto3.client('ssm')
sqs_client = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb', region_name=REGION)


def lambda_handler(event, context):
    dynamodb_parameter = ssm.get_parameter(
        Name='/archive/dynamodb-table', WithDecryption=True)
    table = dynamodb.Table(dynamodb_parameter['Parameter']['Value'])

    sqs_parameter = ssm.get_parameter(
        Name='/sqs/validation', WithDecryption=True)
    sqs_parameter_value = sqs_parameter['Parameter']['Value']

    for message in event["Records"]:
        message_body = json.loads(message["body"])

        dynamodb_response = table.get_item(Key={"id": message_body["archive_id"]})

        validation_completed_increment = dynamodb_response["Item"][
                                             "counters"]["validation"]["validation_completed"] + 1
        validation_count = dynamodb_response["Item"]["counters"]["validation"]["validation_count"]

        table.update_item(
            Key={'id': message_body["archive_id"]},
            UpdateExpression="SET counters.validation.validation_completed = :s",
            ExpressionAttributeValues={':s': validation_completed_increment},
            ReturnValues="UPDATED_NEW"
        )
        if (validation_completed_increment == validation_count):
            table.update_item(
                Key={'id': message_body["archive_id"]},
                UpdateExpression="SET archive_status= :s",
                ExpressionAttributeValues={':s': 'Archived'},
                ReturnValues="UPDATED_NEW"
            )

        print("message_body")
        print(message_body)

        print("receiptHandle")
        print(message["receiptHandle"])

        sqs_client.delete_message(
            QueueUrl=sqs_parameter_value,
            ReceiptHandle=message["receiptHandle"]
        )

    return event
