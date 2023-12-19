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
dynamodb = boto3.resource("dynamodb", region_name=REGION)
ssm = boto3.client("ssm")


def lambda_handler(event, context):
    try:
        # Get SSM Parameter for DynamoDB Table name
        parameter = ssm.get_parameter(
            Name="/archive/dynamodb-table", WithDecryption=True
        )

        # Get record from DynamoDB Table
        table = dynamodb.Table(parameter["Parameter"]["Value"])

        table.update_item(
            Key={"id": event["archive_id"]},
            UpdateExpression="SET archive_status= :s",
            ExpressionAttributeValues={":s": "Archiving"},
            ReturnValues="UPDATED_NEW",
        )

    except:

        table.update_item(
            Key={"id": event["archive_id"]},
            UpdateExpression="SET archive_status= :s",
            ExpressionAttributeValues={":s": "Failed"},
            ReturnValues="UPDATED_NEW",
        )

        raise

    return event
