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

import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { DynamoDBTableConstruct } from '../constructs/dynamodb-table-construct';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { S3BucketConstruct } from '../constructs/s3-bucket-construct';

export class Iam extends Construct {
	public readonly awsGlueRole: Role;
	public readonly dynamoDbReadOnlyPolicy: PolicyStatement;
	public readonly dynamoDbWritePolicy: PolicyStatement;
	public readonly ssmGetParameterPolicy: PolicyStatement;
	public readonly athenaPolicy: PolicyStatement;
	public readonly s3GetObjectAthenaQueryPolicy: PolicyStatement;
	public readonly glueCatalogPolicy: PolicyStatement;
	public readonly glueDatabasePolicy: PolicyStatement;
	public readonly glueTablePolicy: PolicyStatement;
	public readonly glueS3BucketPolicy: PolicyStatement;
	public readonly awsGluePolicy: PolicyStatement;
	public readonly stateMachinePolicy: PolicyStatement;
	public readonly awsGluePolicyTest: PolicyStatement;
	public readonly secretsmanagerCreateSecret: PolicyStatement;
	public readonly secretsmanagerGetSecretValue: PolicyStatement;
	public readonly getItemAsyncTable: PolicyStatement;

	constructor(
		scope: Construct,
		id: string,
		awsRegion: string,
		awsAccountId: string,
		archivesTable: DynamoDBTableConstruct,
		queryLookupTable: DynamoDBTableConstruct,
		fetchSchemaTable: DynamoDBTableConstruct,
		athenaTempBucket: S3BucketConstruct,
		archiveDataBucket: S3BucketConstruct,
		glueAssetBucket: S3BucketConstruct,
		glueTempBucket: S3BucketConstruct
	) {
		super(scope, id);

		this.awsGlueRole = new Role(this, 'AwsGlueRole', {
			assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
			description: 'IAM role for AWS Glue',
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					'service-role/AWSGlueServiceRole'
				),
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					'AmazonS3FullAccess'
				),
			],
		});

		new ssm.StringParameter(this, 'AwsGlueRoleParameter', {
			parameterName: '/glue/glue-role',
			stringValue: this.awsGlueRole.roleName,
			description: 'AWS Glue Role Name',
			type: ssm.ParameterType.STRING,
			tier: ssm.ParameterTier.STANDARD,
			allowedPattern: '.*',
		});

		this.dynamoDbReadOnlyPolicy = new iam.PolicyStatement({
			actions: [
				'dynamodb:BatchGetItem',
				'dynamodb:DescribeImport',
				'dynamodb:ConditionCheckItem',
				'dynamodb:DescribeContributorInsights',
				'dynamodb:Scan',
				'dynamodb:ListTagsOfResource',
				'dynamodb:Query',
				'dynamodb:DescribeStream',
				'dynamodb:DescribeTimeToLive',
				'dynamodb:DescribeGlobalTableSettings',
				'dynamodb:PartiQLSelect',
				'dynamodb:DescribeTable',
				'dynamodb:GetShardIterator',
				'dynamodb:DescribeGlobalTable',
				'dynamodb:GetItem',
				'dynamodb:DescribeContinuousBackups',
				'dynamodb:DescribeExport',
				'dynamodb:DescribeKinesisStreamingDestination',
				'dynamodb:DescribeBackup',
				'dynamodb:GetRecords',
				'dynamodb:DescribeTableReplicaAutoScaling',
			],
			resources: [
				`arn:aws:dynamodb:*:${awsAccountId}:table/${archivesTable.table.tableName}`,
				`arn:aws:dynamodb:*:${awsAccountId}:table/${queryLookupTable.table.tableName}`,
			],
		});

		this.dynamoDbWritePolicy = new iam.PolicyStatement({
			actions: [
				'dynamodb:DeleteItem',
				'dynamodb:RestoreTableToPointInTime',
				'dynamodb:CreateTableReplica',
				'dynamodb:UpdateContributorInsights',
				'dynamodb:UpdateGlobalTable',
				'dynamodb:CreateBackup',
				'dynamodb:DeleteTable',
				'dynamodb:UpdateTableReplicaAutoScaling',
				'dynamodb:UpdateContinuousBackups',
				'dynamodb:PartiQLInsert',
				'dynamodb:CreateGlobalTable',
				'dynamodb:EnableKinesisStreamingDestination',
				'dynamodb:ImportTable',
				'dynamodb:DisableKinesisStreamingDestination',
				'dynamodb:UpdateTimeToLive',
				'dynamodb:BatchWriteItem',
				'dynamodb:PutItem',
				'dynamodb:PartiQLUpdate',
				'dynamodb:StartAwsBackupJob',
				'dynamodb:UpdateItem',
				'dynamodb:DeleteTableReplica',
				'dynamodb:CreateTable',
				'dynamodb:UpdateGlobalTableSettings',
				'dynamodb:RestoreTableFromAwsBackup',
				'dynamodb:RestoreTableFromBackup',
				'dynamodb:ExportTableToPointInTime',
				'dynamodb:DeleteBackup',
				'dynamodb:UpdateTable',
				'dynamodb:PartiQLDelete',
			],
			resources: [
				`arn:aws:dynamodb:*:${awsAccountId}:table/${archivesTable.table.tableName}`,
				`arn:aws:dynamodb:*:${awsAccountId}:table/${queryLookupTable.table.tableName}`,
			],
		});

		this.ssmGetParameterPolicy = new iam.PolicyStatement({
			actions: ['ssm:GetParameter'],
			resources: [
				`arn:aws:ssm:${awsRegion}:${awsAccountId}:parameter/archive/dynamodb-table`,
				`arn:aws:ssm:${awsRegion}:${awsAccountId}:parameter/archive/websocket-connection-dynamodb-table`,
				`arn:aws:ssm:${awsRegion}:${awsAccountId}:parameter/job/s3-bucket-table-data`,
				`arn:aws:ssm:${awsRegion}:${awsAccountId}:parameter/athena/s3-athena-temp-bucket`,
				`arn:aws:ssm:${awsRegion}:${awsAccountId}:parameter/job/step-functions-state-machine`,
				`arn:aws:ssm:${awsRegion}:${awsAccountId}:parameter/glue/s3-bucket-glue-assets`,
				`arn:aws:ssm:${awsRegion}:${awsAccountId}:parameter/job/sf-validation-state-machine`,
				`arn:aws:ssm:${awsRegion}:${awsAccountId}:parameter/glue/temp-dir`,
				`arn:aws:ssm:${awsRegion}:${awsAccountId}:parameter/archive/query-lookup-dynamodb-table`,
				`arn:aws:ssm:${awsRegion}:${awsAccountId}:parameter/glue/glue-role`,
				`arn:aws:ssm:${awsRegion}:${awsAccountId}:parameter/sqs/validation`,
			],
		});

		this.athenaPolicy = new iam.PolicyStatement({
			actions: [
				'athena:GetWorkGroup',
				'athena:GetQueryExecution',
				'athena:GetQueryResults',
				'athena:GetQueryExecution',
				's3:PutObject',
				's3:GetObject',
				'athena:StartQueryExecution',
				'athena:GetQueryResults',
				'glue:GetTable',
			],
			resources: [
				`arn:aws:athena:${awsRegion}:${awsAccountId}:*`,
				`${athenaTempBucket.bucket.bucketArn}/*`,
			],
		});

		this.s3GetObjectAthenaQueryPolicy = new iam.PolicyStatement({
			actions: ['s3:GetObject'],
			resources: [`${archiveDataBucket.bucket.bucketArn}/*`],
		});

		this.glueCatalogPolicy = new iam.PolicyStatement({
			actions: ['glue:GetTable'],
			resources: [`arn:aws:glue:${awsRegion}:${awsAccountId}:catalog`],
		});

		this.glueDatabasePolicy = new iam.PolicyStatement({
			actions: ['glue:GetTable'],
			resources: [`arn:aws:glue:${awsRegion}:${awsAccountId}:database/*`],
		});

		this.glueTablePolicy = new iam.PolicyStatement({
			actions: ['glue:GetTable'],
			resources: [`arn:aws:glue:${awsRegion}:${awsAccountId}:table/*`],
		});

		this.glueS3BucketPolicy = new iam.PolicyStatement({
			actions: [
				's3:GetBucketLocation',
				's3:GetObject',
				's3:ListBucket',
				's3:ListBucketMultipartUploads',
				's3:ListMultipartUploadParts',
				's3:AbortMultipartUpload',
				's3:CreateBucket',
				's3:PutObject',
			],
			resources: [
				glueAssetBucket.bucket.bucketArn,
				glueTempBucket.bucket.bucketArn,
				archiveDataBucket.bucket.bucketArn,
				athenaTempBucket.bucket.bucketArn,
			],
		});

		this.awsGluePolicy = new iam.PolicyStatement({
			actions: [
				'glue:GetConnection',
				'glue:CreateConnection',
				'glue:CreateJob',
				'iam:PassRole',
				'glue:StartJobRun',
				'glue:CreateDatabase',
				'glue:CreateTable',
				'glue:GetDatabase',
				'glue:GetTable',
				'glue:GetJobRun',
			],
			resources: [`arn:aws:glue:${awsRegion}:${awsAccountId}:*`],
		});

		this.stateMachinePolicy = new iam.PolicyStatement({
			actions: ['states:StartExecution'],
			resources: [
				`arn:aws:states:${awsRegion}:${awsAccountId}:stateMachine:*`,
			],
		});

		this.awsGluePolicyTest = new iam.PolicyStatement({
			actions: ['iam:PassRole'],
			resources: [`arn:aws:iam::${awsAccountId}:*`],
		});

		this.secretsmanagerCreateSecret = new iam.PolicyStatement({
			actions: ['secretsmanager:CreateSecret'],
			resources: [
				`arn:aws:secretsmanager:${awsRegion}:${awsAccountId}:secret:*`,
			],
		});

		this.secretsmanagerGetSecretValue = new iam.PolicyStatement({
			actions: ['secretsmanager:GetSecretValue'],
			resources: [
				`arn:aws:secretsmanager:${awsRegion}:${awsAccountId}:secret:*`,
			],
		});

		this.getItemAsyncTable = new iam.PolicyStatement({
			actions: ['dynamodb:GetItem'],
			resources: [fetchSchemaTable.table.tableArn],
		});
	}
}
