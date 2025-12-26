"""
Copyright 2025 Amazon.com, Inc. and its affiliates. All Rights Reserved.

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
import json
import logging
import os
import traceback

# region Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()

if logger.hasHandlers():
    logger.setLevel(LOG_LEVEL)
else:
    logging.basicConfig(level=LOG_LEVEL)
# endregion

s3 = boto3.client('s3')
athena = boto3.client('athena')
ssm = boto3.client('ssm')

def mask_sensitive_data(event):
    keys_to_redact = ["authorization"]
    result = {}
    for k, v in event.items():
        if isinstance(v, dict):
            result[k] = mask_sensitive_data(v)
        elif k in keys_to_redact:
            result[k] = "<redacted>"
        else:
            result[k] = v
    return result

def build_response(http_code, body):
    return {
        "headers": {
            "Cache-Control": "no-cache, no-store",
            "Content-Type": "application/json",
        },
        "statusCode": http_code,
        "body": body,
    }

def lambda_handler(event, context):
    logger.info(mask_sensitive_data(event))

    try:
        body = json.loads(event["body"]) if "body" in event else json.loads(event)
        query_execution_id = body["query_execution_id"]
        
        # Get query execution details
        query_response = athena.get_query_execution(
            QueryExecutionId=query_execution_id
        )
        
        if query_response["QueryExecution"]["Status"]["State"] != "SUCCEEDED":
            return build_response(400, json.dumps({
                "error": "Query not completed successfully"
            }))
        
        # Get the S3 location of the results
        result_config = query_response["QueryExecution"]["ResultConfiguration"]
        output_location = result_config["OutputLocation"]
        
        # Parse S3 URL to get bucket and key
        # Format: s3://bucket-name/path/to/file
        s3_parts = output_location.replace("s3://", "").split("/", 1)
        bucket_name = s3_parts[0]
        object_key = s3_parts[1]
        
        # Generate presigned URL for CSV download (10 minutes expiration)
        presigned_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': object_key},
            ExpiresIn=600  # 10 minutes
        )
        
        # Get object metadata for additional info
        try:
            head_response = s3.head_object(Bucket=bucket_name, Key=object_key)
            file_size = head_response.get('ContentLength', 0)
            last_modified = head_response.get('LastModified')
        except Exception as e:
            logger.warning(f"Could not get object metadata: {str(e)}")
            file_size = 0
            last_modified = None
        
        result = {
            "download_url": presigned_url,
            "expires_in": 600,
            "file_size": file_size,
            "last_modified": last_modified.isoformat() if last_modified else None,
            "query_execution_id": query_execution_id
        }

        return build_response(200, json.dumps(result, default=str))

    except Exception as ex:
        logger.error(traceback.format_exc())
        return build_response(500, json.dumps({
            "error": "Internal server error",
            "message": str(ex)
        }))
