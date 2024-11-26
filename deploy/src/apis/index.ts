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
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambdaPython from '@aws-cdk/aws-lambda-python-alpha';
import * as apigwv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import { Construct } from 'constructs';
import { ApiGatewayV2LambdaConstruct } from '../constructs/apigatewayv2-lambda-construct';
import { ApiGatewayV2CloudFrontConstruct } from '../constructs/apigatewayv2-cloudfront-construct';
import { DasApiPythonConstruct } from '../constructs/das-api-python-construct';
import {
	PolicyStatement,
	Role,
	ServicePrincipal,
	ManagedPolicy,
	Policy,
	Effect,
} from 'aws-cdk-lib/aws-iam';
import { Iam } from '../iam';

interface ApisProps {
	iam: Iam;
	website: {
		cloudFrontDistribution: cdk.aws_cloudfront.Distribution;
	};
	authentication: {
		userPool: cdk.aws_cognito.UserPool;
		webClientUserPool: cdk.aws_cognito.UserPoolClient;
	};
	shared: {
		vpc: ec2.Vpc;
	};
	tables: {
		fetchSchemaTable: {
			table: cdk.aws_dynamodb.Table;
		};
	};
	awsRegion: string;
}

export class Apis extends Construct {
	public readonly testConnectionLambda: lambdaPython.PythonFunction;
	public readonly api: ApiGatewayV2CloudFrontConstruct;
	public readonly rdsSecurityGroup: cdk.aws_ec2.SecurityGroup;

	constructor(scope: Construct, id: string, props: ApisProps) {
		super(scope, id);

		const { iam, website, authentication, shared, tables, awsRegion } =
			props;

		// Create API Gateway
		this.api = new ApiGatewayV2CloudFrontConstruct(this, 'Api', {
			cloudFrontDistribution: website.cloudFrontDistribution,
			userPool: authentication.userPool,
			userPoolClient: authentication.webClientUserPool,
		});

		// IAM Role for Test Connection Lambda
		const testConnectionRole = new Role(this, 'LambdaTestConnectionRole', {
			roleName: 'TestConnectionRole',
			assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
			description: 'IAM Role for the Test Connection Lambda',
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName(
					'service-role/AWSLambdaVPCAccessExecutionRole'
				),
				ManagedPolicy.fromAwsManagedPolicyName(
					'service-role/AWSLambdaBasicExecutionRole'
				),
			],
		});

		// Security Group for RDS
		this.rdsSecurityGroup = new ec2.SecurityGroup(
			this,
			'RdsSecurityGroup',
			{
				vpc: shared.vpc,
				allowAllOutbound: true,
			}
		);

		this.rdsSecurityGroup.addIngressRule(
			this.rdsSecurityGroup,
			ec2.Port.allTraffic(),
			`Allow all inbound traffic from ${this.rdsSecurityGroup.securityGroupId} security group (private subnet)`
		);

		// Test Connection Lambda Function
		this.testConnectionLambda = new lambdaPython.PythonFunction(
			this,
			'LambdaTestConnectionFn',
			{
				role: testConnectionRole,
				vpc: shared.vpc,
				securityGroups: [this.rdsSecurityGroup],
				vpcSubnets: {
					subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
				},
				allowPublicSubnet: true,
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'main.py',
				entry: '../api/archive/source/test-connection',
				timeout: cdk.Duration.seconds(30),
			}
		);

		new ApiGatewayV2LambdaConstruct(
			this,
			'LambdaTestConnectionApiGateway',
			{
				lambdaFn: this.testConnectionLambda,
				routePath: '/api/archive/source/test-connection',
				methods: [apigwv2.HttpMethod.POST],
				api: this.api.apiGatewayV2,
			}
		);

		// Background Lambda Role
		const backgroundRole = new Role(this, 'BackgroundGetSourceTablesRole', {
			roleName: 'BackgroundGetSourceTablesRole',
			assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
			description: 'IAM Role for Background Lambda',
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName(
					'service-role/AWSLambdaVPCAccessExecutionRole'
				),
				ManagedPolicy.fromAwsManagedPolicyName(
					'service-role/AWSLambdaBasicExecutionRole'
				),
			],
		});

		backgroundRole.addToPolicy(
			new PolicyStatement({
				actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
				resources: [tables.fetchSchemaTable.table.tableArn],
			})
		);

		const backgroundLambda = new lambdaPython.PythonFunction(
			this,
			'BackgroundGetSourceTablesLambda',
			{
				role: backgroundRole,
				vpc: shared.vpc,
				securityGroups: [this.rdsSecurityGroup],
				vpcSubnets: {
					subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
				},
				allowPublicSubnet: true,
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'main.py',
				entry: '../functions/async-get-schema',
				timeout: cdk.Duration.minutes(5),
				environment: {
					REGION: awsRegion,
					DYNAMODB_TABLE: tables.fetchSchemaTable.table.tableName,
				},
			}
		);

		// API Role for Database Source Tables
		const apiRole = new Role(this, 'ApiGetDatabaseSourceTablesRole', {
			roleName: 'ApiGetDatabaseSourceTablesRole',
			assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
			description: 'IAM Role for API Lambda',
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName(
					'service-role/AWSLambdaBasicExecutionRole'
				),
			],
		});

		apiRole.addToPolicy(
			new PolicyStatement({
				actions: ['lambda:InvokeFunction'],
				resources: [backgroundLambda.functionArn],
			})
		);

		apiRole.addToPolicy(
			new PolicyStatement({
				actions: ['dynamodb:PutItem'],
				resources: [tables.fetchSchemaTable.table.tableArn],
			})
		);

		const apiLambda = new lambdaPython.PythonFunction(
			this,
			'ApiGetDatabaseSourceTablesLambda',
			{
				role: apiRole,
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'main.py',
				entry: '../api/archive/source/get-tables-async',
				timeout: cdk.Duration.seconds(30),
				environment: {
					REGION: awsRegion,
					BACKGROUND_FUNCTION: backgroundLambda.functionArn,
					DYNAMODB_TABLE: tables.fetchSchemaTable.table.tableName,
				},
			}
		);

		new ApiGatewayV2LambdaConstruct(this, 'ApiDatabaseSourceTablesRoute', {
			lambdaFn: apiLambda,
			routePath: '/api/archive/source/get-tables-async',
			methods: [apigwv2.HttpMethod.POST],
			api: this.api.apiGatewayV2,
		});

		// [START] Legal Hold
		const legalHold = new lambdaPython.PythonFunction(this, 'LegalHoldFn', {
			runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
			handler: 'lambda_handler',
			index: 'main.py',
			entry: '../api/archive/legal',
			timeout: cdk.Duration.minutes(15),
			environment: {
				REGION: awsRegion,
			},
		});

		new ApiGatewayV2LambdaConstruct(this, 'LegalHoldGateway', {
			lambdaFn: legalHold,
			routePath: '/api/archive/legal',
			methods: [apigwv2.HttpMethod.POST],
			api: this.api.apiGatewayV2,
		});

		legalHold.role?.attachInlinePolicy(
			new Policy(this, 'LegalHoldPolicy', {
				statements: [
					iam.dynamoDbReadOnlyPolicy,
					iam.ssmGetParameterPolicy,
					iam.dynamoDbWritePolicy,
				],
			})
		);

		legalHold.role?.attachInlinePolicy(
			new Policy(this, 'LegalHoldInlinePolicy', {
				statements: [
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: [
							's3:GetBucketLocation',
							's3:GetObject',
							's3:ListBucket',
							's3:ListBucketMultipartUploads',
							's3:ListMultipartUploadParts',
							's3:AbortMultipartUpload',
							's3:CreateBucket',
							's3:PutObject',
							's3:PutObjectLegalHold',
						],
						resources: ['*'],
					}),
				],
			})
		);
		// [END] Legal Hold

		// [START] Expiration
		const expiration = new lambdaPython.PythonFunction(
			this,
			'ExpirationFn',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'main.py',
				entry: '../api/archive/expiration',
				timeout: cdk.Duration.minutes(15),
				environment: {
					REGION: awsRegion,
				},
			}
		);

		new ApiGatewayV2LambdaConstruct(this, 'ExpirationGateway', {
			lambdaFn: expiration,
			routePath: '/api/archive/expiration',
			methods: [apigwv2.HttpMethod.POST],
			api: this.api.apiGatewayV2,
		});

		expiration.role?.attachInlinePolicy(
			new Policy(this, 'ExpirationPolicy', {
				statements: [
					iam.dynamoDbReadOnlyPolicy,
					iam.ssmGetParameterPolicy,
					iam.dynamoDbWritePolicy,
				],
			})
		);

		expiration.role?.attachInlinePolicy(
			new Policy(this, 'ExpirationInlinePolicy', {
				statements: [
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: [
							's3:GetBucketLocation',
							's3:GetObject',
							's3:ListBucket',
							's3:ListBucketMultipartUploads',
							's3:ListMultipartUploadParts',
							's3:AbortMultipartUpload',
							's3:PutBucketLifecycleConfiguration',
							's3:PutLifecycleConfiguration',
						],
						resources: ['*'],
					}),
				],
			})
		);
		// [END] Expiration

		// [START] api/archive/validate
		const validateArchive = new lambdaPython.PythonFunction(
			this,
			'ValidateArchiveFn',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'main.py',
				entry: '../api/archive/validate',
				timeout: cdk.Duration.minutes(5),
				environment: {
					REGION: awsRegion,
				},
			}
		);

		new ApiGatewayV2LambdaConstruct(this, 'ValidateArchiveApiGateway', {
			lambdaFn: validateArchive,
			routePath: '/api/archive/validate',
			methods: [apigwv2.HttpMethod.POST],
			api: this.api.apiGatewayV2,
		});

		validateArchive.role?.attachInlinePolicy(
			new Policy(this, 'ValidateArchiveFnPolicy', {
				statements: [
					iam.ssmGetParameterPolicy,
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
				],
			})
		);
		// [END] api/archive/validate

		// [START] api/archive/archive
		const archive = new lambdaPython.PythonFunction(this, 'ArchiveFn', {
			runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
			handler: 'lambda_handler',
			index: 'main.py',
			entry: '../api/archive/archive',
			timeout: cdk.Duration.minutes(5),
			environment: {
				REGION: awsRegion,
			},
		});

		new ApiGatewayV2LambdaConstruct(this, 'ArchiveApiGateway', {
			lambdaFn: archive,
			routePath: '/api/archive/archive',
			methods: [apigwv2.HttpMethod.POST],
			api: this.api.apiGatewayV2,
		});

		archive.role?.attachInlinePolicy(
			new Policy(this, 'ArchiveFnPolicy', {
				statements: [
					iam.ssmGetParameterPolicy,
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
				],
			})
		);
		// [START] api/archive/archive

		const sdasApis = [
			{
				name: 'TablesStatus',
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'main.py',
				entry: '../api/archive/source/get-tables-async/status',
				timeout: cdk.Duration.seconds(30),
				environment: {
					DYNAMODB_TABLE: tables.fetchSchemaTable.table.tableName,
				},
				routePath: '/api/archive/source/get-tables-async/status',
				methods: [apigwv2.HttpMethod.GET],
				api: this.api.apiGatewayV2,
				iamInlinePolicy: [iam.getItemAsyncTable],
			},
			{
				name: 'TablesResult',
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'main.py',
				entry: '../api/archive/source/get-tables-async/results',
				timeout: cdk.Duration.seconds(30),
				environment: {
					DYNAMODB_TABLE: tables.fetchSchemaTable.table.tableName,
				},
				routePath: '/api/archive/source/get-tables-async/results',
				methods: [apigwv2.HttpMethod.GET],
				api: this.api.apiGatewayV2,
				iamInlinePolicy: [iam.getItemAsyncTable],
			},
			{
				name: 'CreateArchive',
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'main.py',
				entry: '../api/archive/create',
				timeout: cdk.Duration.minutes(5),
				environment: {},
				routePath: '/api/archive/create',
				methods: [apigwv2.HttpMethod.POST],
				api: this.api.apiGatewayV2,
				iamInlinePolicy: [
					iam.dynamoDbWritePolicy,
					iam.ssmGetParameterPolicy,
					iam.secretsmanagerCreateSecret,
				],
			},
			{
				name: 'DeleteDatabaseItem',
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'main.py',
				entry: '../api/archive/delete',
				timeout: cdk.Duration.minutes(5),
				environment: {},
				routePath: '/api/archive/delete',
				methods: [apigwv2.HttpMethod.POST],
				api: this.api.apiGatewayV2,
				iamInlinePolicy: [
					iam.dynamoDbReadOnlyPolicy,
					iam.dynamoDbWritePolicy,
					iam.ssmGetParameterPolicy,
				],
			},
			{
				name: 'ListArchives',
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'main.py',
				entry: '../api/archives/list',
				timeout: cdk.Duration.minutes(5),
				environment: {
					REGION: awsRegion,
				},
				routePath: '/api/archives/list',
				methods: [apigwv2.HttpMethod.GET],
				api: this.api.apiGatewayV2,
				iamInlinePolicy: [
					iam.dynamoDbReadOnlyPolicy,
					iam.dynamoDbWritePolicy,
					iam.ssmGetParameterPolicy,
				],
			},
			{
				name: 'GetArchive',
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'main.py',
				entry: '../api/archive/get',
				timeout: cdk.Duration.minutes(5),
				environment: {},
				routePath: '/api/archive/get',
				methods: [apigwv2.HttpMethod.POST],
				api: this.api.apiGatewayV2,
				iamInlinePolicy: [
					iam.dynamoDbReadOnlyPolicy,
					iam.dynamoDbWritePolicy,
					iam.ssmGetParameterPolicy,
				],
			},
			{
				name: 'RunArchiveJob',
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'main.py',
				entry: '../api/job/run',
				timeout: cdk.Duration.minutes(5),
				environment: {
					REGION: awsRegion,
				},
				routePath: '/api/job/run',
				methods: [apigwv2.HttpMethod.POST],
				api: this.api.apiGatewayV2,
				iamInlinePolicy: [
					iam.dynamoDbReadOnlyPolicy,
					iam.dynamoDbWritePolicy,
					iam.ssmGetParameterPolicy,
					iam.stateMachinePolicy,
					iam.glueS3BucketPolicy,
				],
			},
			{
				name: 'AthenaQuery',
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'main.py',
				entry: '../api/archive/query',
				timeout: cdk.Duration.minutes(15),
				environment: {},
				routePath: '/api/archive/query',
				methods: [apigwv2.HttpMethod.POST],
				api: this.api.apiGatewayV2,
				iamInlinePolicy: [
					iam.ssmGetParameterPolicy,
					iam.athenaPolicy,
					iam.s3GetObjectAthenaQueryPolicy,
					iam.glueCatalogPolicy,
					iam.glueDatabasePolicy,
					iam.glueTablePolicy,
					iam.glueS3BucketPolicy,
				],
			},
		];

		for (const val of sdasApis) {
			new DasApiPythonConstruct(this, val.name, {
				name: val.name,
				runtime: val.runtime,
				handler: val.handler,
				index: val.index,
				entry: val.entry,
				timeout: val.timeout,
				environment: val.environment,
				routePath: val.routePath,
				methods: val.methods,
				api: val.api,
				iamInlinePolicy: val.iamInlinePolicy,
			});
		}
	}
}
