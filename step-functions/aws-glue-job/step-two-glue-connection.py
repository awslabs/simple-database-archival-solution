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

AVAILABILITY_ZONE = os.environ["AVAILABILITY_ZONE"]
SUBNET_ID = os.environ["SUBNET_ID"]
RDS_SECURITY_GROUP = os.environ["RDS_SECURITY_GROUP"]
VPC_DEFAULT_SECURITY_GROUP = os.environ["VPC_DEFAULT_SECURITY_GROUP"]
REGION = os.getenv("REGION")

glue_client = boto3.client('glue', region_name=REGION)
dynamodb = boto3.resource('dynamodb', region_name=REGION)
ssm = boto3.client('ssm')
secret_client = boto3.client('secretsmanager')


def lambda_handler(event, context):

    # Get SSM Parameter for DynamoDB Table name
    parameter = ssm.get_parameter(
        Name='/archive/dynamodb-table', WithDecryption=True)

    # Get record from DynamoDB Table
    table = dynamodb.Table(parameter['Parameter']['Value'])
    dynamodb_response = table.get_item(Key={"id": event["archive_id"]})

    # Check if a AWS Glue connection exists If it does not
    # exist, create a connection.
    try:
        glue_client.get_connection(
            Name=f'{dynamodb_response["Item"]["id"]}-{dynamodb_response["Item"]["database"]}-connection',
            HidePassword=True)
    except glue_client.exceptions.EntityNotFoundException:

        try:
            secret_value = secret_client.get_secret_value(
                SecretId=dynamodb_response["Item"]["secret_arn"])
            print(secret_value["SecretString"])
            if dynamodb_response["Item"]["database_engine"] == "mysql":
                glue_client.create_connection(
                    ConnectionInput={
                        'Name': f'{dynamodb_response["Item"]["id"]}-{dynamodb_response["Item"]["database"]}-connection',
                        'Description': f'Connection for archive ID: {dynamodb_response["Item"]["id"]}',
                        'ConnectionType': 'JDBC',
                        'ConnectionProperties': {
                            'USERNAME': dynamodb_response["Item"]["username"],
                            'JDBC_ENFORCE_SSL': 'false',
                            'PASSWORD': secret_value["SecretString"],
                            'JDBC_CONNECTION_URL': f'jdbc:mysql://{dynamodb_response["Item"]["hostname"]}:{dynamodb_response["Item"]["port"]}/{dynamodb_response["Item"]["database"]}'
                        },
                        'PhysicalConnectionRequirements': {
                            'SubnetId': SUBNET_ID,
                            'SecurityGroupIdList': [
                                RDS_SECURITY_GROUP,
                                VPC_DEFAULT_SECURITY_GROUP,
                            ],
                            'AvailabilityZone': AVAILABILITY_ZONE
                        }
                    }
                )
            elif dynamodb_response["Item"]["database_engine"] == "mssql":
                glue_client.create_connection(
                    ConnectionInput={
                        'Name': f'{dynamodb_response["Item"]["id"]}-{dynamodb_response["Item"]["database"]}-connection',
                        'Description': f'Connection for archive ID: {dynamodb_response["Item"]["id"]}',
                        'ConnectionType': 'JDBC',
                        'ConnectionProperties': {
                            'USERNAME': dynamodb_response["Item"]["username"],
                            'JDBC_ENFORCE_SSL': 'false',
                            'PASSWORD': secret_value["SecretString"],
                            'JDBC_CONNECTION_URL': f'jdbc:sqlserver://{dynamodb_response["Item"]["hostname"]}:{dynamodb_response["Item"]["port"]};database={dynamodb_response["Item"]["database"]}'
                        },
                        'PhysicalConnectionRequirements': {
                            'SubnetId': SUBNET_ID,
                            'SecurityGroupIdList': [
                                RDS_SECURITY_GROUP,
                                VPC_DEFAULT_SECURITY_GROUP,
                            ],
                            'AvailabilityZone': AVAILABILITY_ZONE
                        }
                    }
                )
            elif dynamodb_response["Item"]["database_engine"] == "oracle":
                glue_client.create_connection(
                    ConnectionInput={
                        'Name': f'{dynamodb_response["Item"]["id"]}-{dynamodb_response["Item"]["database"]}-connection',
                        'Description': f'Connection for archive ID: {dynamodb_response["Item"]["id"]}',
                        'ConnectionType': 'JDBC',
                        'ConnectionProperties': {
                            'USERNAME': dynamodb_response["Item"]["username"],
                            'JDBC_ENFORCE_SSL': 'false',
                            'PASSWORD': secret_value["SecretString"],
                            'JDBC_CONNECTION_URL': f'jdbc:oracle://{dynamodb_response["Item"]["hostname"]}:{dynamodb_response["Item"]["port"]}/{dynamodb_response["Item"]["database"]}'
                        },
                        'PhysicalConnectionRequirements': {
                            'SubnetId': SUBNET_ID,
                            'SecurityGroupIdList': [
                                RDS_SECURITY_GROUP,
                                VPC_DEFAULT_SECURITY_GROUP,
                            ],
                            'AvailabilityZone': AVAILABILITY_ZONE
                        }
                    }
                )
            elif dynamodb_response["Item"]["database_engine"] == "postgresql":
                glue_client.create_connection(
                    ConnectionInput={
                        'Name': f'{dynamodb_response["Item"]["id"]}-{dynamodb_response["Item"]["database"]}-connection',
                        'Description': f'Connection for archive ID: {dynamodb_response["Item"]["id"]}',
                        'ConnectionType': 'JDBC',
                        'ConnectionProperties': {
                            'USERNAME': dynamodb_response["Item"]["username"],
                            'JDBC_ENFORCE_SSL': 'false',
                            'PASSWORD': secret_value["SecretString"],
                            'JDBC_CONNECTION_URL': f'jdbc:postgresql://{dynamodb_response["Item"]["hostname"]}:{dynamodb_response["Item"]["port"]}/{dynamodb_response["Item"]["database"]}'
                        },
                        'PhysicalConnectionRequirements': {
                            'SubnetId': SUBNET_ID,
                            'SecurityGroupIdList': [
                                RDS_SECURITY_GROUP,
                                VPC_DEFAULT_SECURITY_GROUP,
                            ],
                            'AvailabilityZone': AVAILABILITY_ZONE
                        }
                    }
                )
        except:
            table.update_item(
                Key={'id': event["archive_id"]},
                UpdateExpression="SET archive_status= :s",
                ExpressionAttributeValues={':s': 'Failed'},
                ReturnValues="UPDATED_NEW"
            )
            raise

    return dynamodb_response
