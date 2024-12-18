/**
 * Copyright 2024 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *   https://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { S3BucketConstruct } from '../constructs/s3-bucket-construct';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { v4 as uuidv4 } from 'uuid';

function getShortUuidSegment(): string {
	const fullUuid = uuidv4();
	return fullUuid.split('-')[0];
}

export class Buckets extends Construct {
	public readonly glueAssetBucket: S3BucketConstruct;
	public readonly glueTempBucket: S3BucketConstruct;
	public readonly archiveDataBucket: S3BucketConstruct;
	public readonly athenaTempBucket: S3BucketConstruct;

	constructor(scope: Construct, id: string) {
		super(scope, id);

		// Glue Asset Bucket
		this.glueAssetBucket = new S3BucketConstruct(this, 'GlueArtifacts', {
			bucketName: `glue-artifacts-${getShortUuidSegment()}`,
			cfnOutputName: 'GlueAsset',
			addEventNotification: true,
			enforceSSL: true,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
			encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
			serverAccessLogsPrefix: 'access-logs/',
			versioned: true,
			deleteObjects: true,
			objectLockEnabled: false,
		});

		new ssm.StringParameter(this, 'CreateS3GlueAssetBucketParam', {
			parameterName: '/glue/s3-bucket-glue-assets',
			stringValue: this.glueAssetBucket.bucketName,
			description: 'AWS Glue Asset bucket',
			tier: ssm.ParameterTier.STANDARD,
			allowedPattern: '.*',
		});

		// Glue Temp Bucket
		this.glueTempBucket = new S3BucketConstruct(this, 'GlueTemp', {
			bucketName: `glue-temp-${getShortUuidSegment()}`,
			cfnOutputName: 'GlueTemp',
			addEventNotification: true,
			enforceSSL: true,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
			encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
			serverAccessLogsPrefix: 'access-logs/',
			versioned: true,
			deleteObjects: false,
			objectLockEnabled: false,
		});

		new ssm.StringParameter(this, 'S3AwsGlueTempBucketParameter', {
			parameterName: '/glue/temp-dir',
			stringValue: this.glueTempBucket.bucketName,
			description: 'AWS Glue Temp bucket',
			tier: ssm.ParameterTier.STANDARD,
			allowedPattern: '.*',
		});

		// Archive Data Glue Bucket
		this.archiveDataBucket = new S3BucketConstruct(
			this,
			'ArchiveStructuredData',
			{
				bucketName: `archive-structured-data-${getShortUuidSegment()}`,
				cfnOutputName: 'ArchiveData',
				addEventNotification: true,
				enforceSSL: true,
				removalPolicy: cdk.RemovalPolicy.DESTROY,
				blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
				encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
				serverAccessLogsPrefix: 'access-logs/',
				versioned: true,
				deleteObjects: false,
				objectLockEnabled: true,
			}
		);

		new ssm.StringParameter(this, 'CreateS3TableDataGlueParam', {
			parameterName: '/job/s3-bucket-table-data',
			stringValue: this.archiveDataBucket.bucketName,
			description: 'AWS Glue Table data bucket',
			tier: ssm.ParameterTier.STANDARD,
			allowedPattern: '.*',
		});

		// Athena Temp Bucket
		this.athenaTempBucket = new S3BucketConstruct(this, 'AthenaTemp', {
			bucketName: `athena-temp-${getShortUuidSegment()}`,
			cfnOutputName: 'AthenaTemp',
			addEventNotification: true,
			enforceSSL: true,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
			encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
			serverAccessLogsPrefix: 'access-logs/',
			versioned: true,
			deleteObjects: false,
			objectLockEnabled: false,
		});

		new ssm.StringParameter(this, 'S3AthenaTempBucketParameter', {
			parameterName: '/athena/s3-athena-temp-bucket',
			stringValue: this.athenaTempBucket.bucketName,
			description: 'AWS Glue Table data bucket',
			tier: ssm.ParameterTier.STANDARD,
			allowedPattern: '.*',
		});
	}
}
