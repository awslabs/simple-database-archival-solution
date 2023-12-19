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

import os
import boto3
import uuid
import json

REGION = os.getenv("REGION")
ARCHIVE_TABLE = os.environ["ARCHIVE_TABLE"]
VALIDATION_STATE_MACHINE = os.environ["VALIDATION_STATE_MACHINE"]

dynamodb_client = boto3.resource('dynamodb', region_name=REGION)
glue_client = boto3.client('glue', region_name=REGION)
step_functions_client = boto3.client('stepfunctions')


def update_job_state(archive_id, job_run_id, job_name, job_message, job_state, job_timestamp, table_name, started_on,
                     completed_on):
    """
    Updates the state of a job run in a DynamoDB table.

    Args:
    id (str): The ID of the job.
    job_run_id (str): The ID of the job run.
    job_name (str): The name of the job.
    job_message (str): The message associated with the job run.
    job_state (str): The state of the job run.
    job_timestamp (datetime): The timestamp of the job run.
    table_name (str): The name of the DynamoDB table to update.
    started_on (datetime): The timestamp when the job was started.
    completed_on (datetime): The timestamp when the job was completed.

    Returns:
    dict: A dictionary containing the result of the update operation.

    Raises:
    botocore.exceptions.ClientError: If there is an error with the AWS client.

    Example Usage:
    >>> update_job_state("abc123", "run1", "job1", "job completed successfully", "completed", datetime.now(), "my_table", datetime.now(), datetime.now())
    """

    table = dynamodb_client.Table(table_name)
    result = table.update_item(
        Key={
            "id": archive_id
        },
        UpdateExpression="SET jobs.#job_run_id = :job_state",
        ExpressionAttributeNames={
            "#job_run_id": job_run_id
        },
        ExpressionAttributeValues={
            ":job_state": {
                "job_name": job_name,
                "job_run_id": job_run_id,
                "message": job_message,
                "state": job_state,
                "timestamp": str(job_timestamp),
                "started_on": str(started_on),
                "completed_on": str(completed_on),
            }
        },
    )
    return result


def lambda_handler(event, context):
    """
    Lambda function that handles AWS Glue job state changes and triggers a Step Functions state machine
    to run validation.

    The function receives an event dictionary with information about the Glue job run, such as the job name, job run ID,
    and state. It extracts the archive ID from the job name and retrieves the corresponding archive record from a
    DynamoDB table. If the job run succeeded, it extracts the table schema from the archive record and triggers a Step
    Functions state machine to validate the table schema. If the job run failed, it updates the archive status in the
    DynamoDB table to 'Failed'. The function returns the input event dictionary.

    :param event: A dictionary with information about the Glue job run, including the job name, job run ID, and state.
    :type event: dict
    :param context: A dictionary with information about the Lambda execution environment.
    :type context: dict
    :return: The input event dictionary.
    :rtype: dict
    """

    if ("jobName" in event["detail"]):
        x = event["detail"]["jobName"].split("-")
        archive_id = x[0] + "-" + x[1] + "-" + x[2] + "-" + x[3] + "-" + x[4]

        table = dynamodb_client.Table(ARCHIVE_TABLE)
        dynamodb_response = table.get_item(Key={"id": archive_id})

        response = glue_client.get_job_run(
            JobName=event["detail"]["jobName"],
            RunId=event["detail"]["jobRunId"],
            PredecessorsIncluded=False
        )

        # Set Job State
        update_job_state(
            archive_id,
            event["detail"]["jobRunId"],
            event["detail"]["jobName"],
            event["detail"]["message"],
            event["detail"]["state"],
            event["time"],
            ARCHIVE_TABLE,
            response["JobRun"]["StartedOn"],
            response["JobRun"]["CompletedOn"]
        )

        if (event["detail"]["state"] == 'FAILED'):
            table.update_item(
                Key={'id': archive_id},
                UpdateExpression="SET job_status= :s",
                ExpressionAttributeValues={':s': 'Failed'},
                ReturnValues="UPDATED_NEW"
            )
            table.update_item(
                Key={'id': archive_id},
                UpdateExpression="SET archive_status= :s",
                ExpressionAttributeValues={':s': 'Failed'},
                ReturnValues="UPDATED_NEW"
            )

        if (event["detail"]["state"] == 'SUCCEEDED'):

            if dynamodb_response["Item"]["job_status"] != "Failed":
                table.update_item(
                    Key={'id': archive_id},
                    UpdateExpression="SET job_status= :s",
                    ExpressionAttributeValues={':s': 'Succeeded'},
                    ReturnValues="UPDATED_NEW"
                )

                table.update_item(
                    Key={'id': archive_id},
                    UpdateExpression="SET archive_status= :s",
                    ExpressionAttributeValues={':s': 'Validating'},
                    ReturnValues="UPDATED_NEW"
                )

            return_table = {
                "table": {
                    "schema": []
                }
            }

            dynamodb_updated_response = table.get_item(Key={"id": archive_id})
            for table in dynamodb_updated_response["Item"]["table_details"]:
                if (table["table"] == x[6]):
                    return_table["table"]["archive_id"] = archive_id
                    return_table["table"]["schema"] = table["schema"]
                    return_table["table"]["table"] = table["table"]
                    return_table["table"]["database"] = dynamodb_updated_response["Item"]["database"]
                    return_table["table"]["database_engine"] = dynamodb_updated_response["Item"]["database_engine"]
                    return_table["table"]["oracle_owner"] = dynamodb_updated_response["Item"]["oracle_owner"]

            step_functions_client.start_execution(
                stateMachineArn=VALIDATION_STATE_MACHINE,
                name=str(uuid.uuid4()),
                input=json.dumps(return_table),
            )

    return event
