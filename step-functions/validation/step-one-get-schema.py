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

REGION = os.getenv("REGION")
dynamodb = boto3.resource('dynamodb', region_name=REGION)
ssm = boto3.client('ssm')


def update_validation_count(archive_id):
    """
    Updates the validation count of the specified archive in DynamoDB.

    Args:
    archive_id (str): The ID of the archive to update.

    Returns:
    None

    Raises:
    botocore.exceptions.ClientError: If there is an error with the AWS client.
    """

    parameter = ssm.get_parameter(
        Name='/archive/dynamodb-table', WithDecryption=True)
    table = dynamodb.Table(parameter['Parameter']['Value'])

    # Instead of fetching and incrementing in the code, use ADD to increment atomically
    table.update_item(
        Key={'id': archive_id},
        UpdateExpression="ADD counters.validation.validation_count :inc",
        ExpressionAttributeValues={':inc': 1},
        ReturnValues="UPDATED_NEW"
    )


def lambda_handler(event, context):
    """
    Handles an AWS Lambda event and performs validation on a table schema.

    Args:
    event (dict): A dictionary containing information about the table schema to validate.
    context (object): An object representing the context of the AWS Lambda function.

    Returns:
    dict: A dictionary containing the results of the schema validation.

    Raises:
    botocore.exceptions.ClientError: If there is an error with the AWS client.
    """
    # GET SCHEMA from EVENT
    return_event = []

    string_counter = 0
    number_counter = 0

    # Count Validation
    update_validation_count(event["table"]["archive_id"])
    return_event.append({
        "table": event["table"]["table"],
        "archive_id": event["table"]["archive_id"],
        "database": event["table"]["database"],
        "database_engine": event["table"]["database_engine"],
        "oracle_owner": event["table"]["oracle_owner"],
        "validation_type": "count_validation"
    })

    # String Validation
    for schema in event["table"]["schema"][::-1]:
        if schema["value"] == "string":
            update_validation_count(event["table"]["archive_id"])
            return_event.append({
                "table": event["table"]["table"],
                "archive_id": event["table"]["archive_id"],
                "database": event["table"]["database"],
                "database_engine": event["table"]["database_engine"],
                "oracle_owner": event["table"]["oracle_owner"],
                "key": schema["key"],
                "value": schema["value"],
                "validation_type": "string_validation"
            })
            string_counter += 1
        if string_counter == 1:
            break

    # Number Validation
    for schema in event["table"]["schema"][::-1]:
        if schema["value"] in ["decimal", "number", "int"]:
            update_validation_count(event["table"]["archive_id"])
            return_event.append({
                "table": event["table"]["table"],
                "archive_id": event["table"]["archive_id"],
                "database": event["table"]["database"],
                "database_engine": event["table"]["database_engine"],
                "oracle_owner": event["table"]["oracle_owner"],
                "key": schema["key"],
                "value": schema["value"],
                "validation_type": "number_validation"
            })
            number_counter += 1
        if number_counter == 1:
            break

    return {"Payload": return_event}
