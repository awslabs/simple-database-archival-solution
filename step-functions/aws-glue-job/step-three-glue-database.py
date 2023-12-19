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

    table = dynamodb.Table(parameter['Parameter']['Value'])

    # Check if an AWS Glue database exists. If it does not
    # exist, create a database.
    try:
        response = client.get_database(
            Name=f'{event["Item"]["id"]}-{event["Item"]["database"]}-database'
        )
        print(response)
    except:
        try:
            client.create_database(
                DatabaseInput={
                    'Name': f'{event["Item"]["id"]}-{event["Item"]["database"]}-database',
                    'Description': f'Database for archive ID: {event["Item"]["id"]}',
                }
            )
        except:
            table.update_item(
                Key={'id': event["Item"]["id"]},
                UpdateExpression="SET archive_status= :s",
                ExpressionAttributeValues={':s': 'Failed'},
                ReturnValues="UPDATED_NEW"
            )
            raise

    return event
