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
import * as lambdaPython from '@aws-cdk/aws-lambda-python-alpha';
import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Iam } from '../../iam';
import { Tables } from '../../tables';

export class Validation extends Construct {
	constructor(
		scope: Construct,
		id: string,
		awsAccountId: string,
		awsRegion: string,
		iam: Iam,
		tables: Tables
	) {
		super(scope, id);

		/*
		 * START
		 * SQS FIFO Queue for Validation
		 */

		const validationQueueFn = new lambdaPython.PythonFunction(
			this,
			'ValidationQueueFn',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'validation.py',
				entry: '../functions/sqs',
				timeout: cdk.Duration.seconds(60),
				environment: {
					REGION: awsRegion,
				},
			}
		);

		validationQueueFn.role?.attachInlinePolicy(
			new Policy(this, 'ValidationQueueFnPolicy', {
				statements: [
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
					iam.ssmGetParameterPolicy,
				],
			})
		);

		const sqsFifoValidation = new sqs.Queue(this, 'ValidationQueue', {
			encryption: sqs.QueueEncryption.KMS_MANAGED,
			visibilityTimeout: Duration.seconds(60),
			fifo: true,
		});

		new ssm.StringParameter(this, 'SqsFifoValidationParam', {
			parameterName: '/sqs/validation',
			stringValue: sqsFifoValidation.queueUrl,
			description: 'Queue for tracking validation completion status',
			type: ssm.ParameterType.STRING,
			tier: ssm.ParameterTier.STANDARD,
			allowedPattern: '.*',
		});

		const sqsPolicy = new PolicyStatement({
			actions: ['sqs:SendMessage'],
			resources: [
				`arn:aws:sqs:*:${awsAccountId}:${sqsFifoValidation.queueName}`,
			],
		});

		validationQueueFn.addEventSource(
			new SqsEventSource(sqsFifoValidation, {})
		);

		/*
		 * END
		 * SQS FIFO Queue for Validation
		 */

		const stepFunctionValidationStepOne = new lambdaPython.PythonFunction(
			this,
			'StepFunctionValidationStepOne',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'step-one-get-schema.py',
				entry: '../step-functions/validation',
				timeout: cdk.Duration.minutes(5),
				environment: {},
			}
		);

		stepFunctionValidationStepOne.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionValidationStepOnePolicy', {
				statements: [
					iam.ssmGetParameterPolicy,
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
				],
			})
		);

		const stepFunctionValidationStepThree = new lambdaPython.PythonFunction(
			this,
			'StepFunctionValidationStepThree',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'step-three-output-validation.py',
				entry: '../step-functions/validation',
				timeout: cdk.Duration.minutes(5),
				environment: {},
			}
		);

		stepFunctionValidationStepThree.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionValidationStepThreePolicy', {})
		);

		const stepFunctionValidationCount = new lambdaPython.PythonFunction(
			this,
			'StepFunctionValidationStepTwo',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'count-validation.py',
				entry: '../step-functions/validation',
				timeout: cdk.Duration.minutes(5),
				environment: {
					REGION: awsRegion,
				},
			}
		);

		stepFunctionValidationCount.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionValidationStepTwoPolicy', {
				statements: [
					iam.ssmGetParameterPolicy,
					iam.athenaPolicy,
					iam.awsGluePolicy,
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
				],
			})
		);

		stepFunctionValidationCount.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionValidationCountInlinePolicy', {
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
						],
						resources: ['*'],
					}),
				],
			})
		);

		const stepFunctionValidationString = new lambdaPython.PythonFunction(
			this,
			'StepFunctionValidationString',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'string-validation.py',
				entry: '../step-functions/validation',
				timeout: cdk.Duration.minutes(5),
				environment: {
					REGION: awsRegion,
				},
			}
		);

		stepFunctionValidationString.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionValidationStringPolicy', {
				statements: [
					iam.ssmGetParameterPolicy,
					iam.athenaPolicy,
					iam.awsGluePolicy,
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
				],
			})
		);

		stepFunctionValidationString.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionValidationStringInlinePolicy', {
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
						],
						resources: ['*'],
					}),
				],
			})
		);

		const stepFunctionValidationNumber = new lambdaPython.PythonFunction(
			this,
			'StepFunctionValidationNumber',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'number-validation.py',
				entry: '../step-functions/validation',
				timeout: cdk.Duration.minutes(5),
				environment: {
					REGION: awsRegion,
				},
			}
		);

		stepFunctionValidationNumber.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionValidationNumberPolicy', {
				statements: [
					iam.ssmGetParameterPolicy,
					iam.athenaPolicy,
					iam.awsGluePolicy,
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
				],
			})
		);

		stepFunctionValidationNumber.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionValidationNumberInlinePolicy', {
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
						],
						resources: ['*'],
					}),
				],
			})
		);

		const retryPolicy = {
			errors: ['ClientError'],
			interval: cdk.Duration.seconds(300),
			maxAttempts: 9,
			backoffRate: 2.5,
		};

		const validationDefinition =
			new cdk.aws_stepfunctions_tasks.LambdaInvoke(
				this,
				'Step One - Get Schema',
				{
					lambdaFunction: stepFunctionValidationStepOne,
					outputPath: '$.Payload',
				}
			)
				.addRetry(retryPolicy)
				.next(
					new cdk.aws_stepfunctions.Map(
						this,
						'Step Two - Map Validations',
						{
							maxConcurrency: 10,
							itemsPath:
								cdk.aws_stepfunctions.JsonPath.stringAt(
									'$.Payload'
								),
						}
					).iterator(
						new cdk.aws_stepfunctions.Choice(
							this,
							'EvaluateValidation'
						)
							.when(
								cdk.aws_stepfunctions.Condition.stringEquals(
									'$.validation_type',
									'count_validation'
								),
								new cdk.aws_stepfunctions_tasks.LambdaInvoke(
									this,
									'Count Validation',
									{
										lambdaFunction:
											stepFunctionValidationCount,
										outputPath: '$.Payload',
									}
								).addRetry(retryPolicy)
							)
							.when(
								cdk.aws_stepfunctions.Condition.stringEquals(
									'$.validation_type',
									'number_validation'
								),
								new cdk.aws_stepfunctions_tasks.LambdaInvoke(
									this,
									'Number Validation',
									{
										lambdaFunction:
											stepFunctionValidationNumber,
										outputPath: '$.Payload',
									}
								).addRetry(retryPolicy)
							)
							.when(
								cdk.aws_stepfunctions.Condition.stringEquals(
									'$.validation_type',
									'string_validation'
								),
								new cdk.aws_stepfunctions_tasks.LambdaInvoke(
									this,
									'String Validation',
									{
										lambdaFunction:
											stepFunctionValidationString,
										outputPath: '$.Payload',
									}
								).addRetry(retryPolicy)
							)
					)
				);

		const validationLogGroup = new cdk.aws_logs.LogGroup(
			this,
			'ValidationStateMachineLog',
			{
				removalPolicy: RemovalPolicy.DESTROY,
			}
		);

		const validationStateMachine = new cdk.aws_stepfunctions.StateMachine(
			this,
			'ValidationStateMachine',
			{
				definition: validationDefinition,
				tracingEnabled: true,
				logs: {
					destination: validationLogGroup,
					level: cdk.aws_stepfunctions.LogLevel.ALL,
				},
			}
		);

		const createValidationStateMachineParam = new ssm.StringParameter(
			this,
			'CreateValidationStateMachineParam',
			{
				parameterName: '/job/sf-validation-state-machine',
				stringValue: `arn:aws:states:${awsRegion}:${awsAccountId}:stateMachine:${validationStateMachine.stateMachineName}`,
				description: 'Name for state machine',
				type: ssm.ParameterType.STRING,
				tier: ssm.ParameterTier.STANDARD,
				allowedPattern: '.*',
			}
		);

		const glueJobStatusFn = new lambdaPython.PythonFunction(
			this,
			'GlueJobStatusFn',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'glue-job-status.py',
				entry: '../functions/eventbridge',
				timeout: cdk.Duration.seconds(30),
				environment: {
					REGION: awsRegion,
					ARCHIVE_TABLE: tables.archivesTable.table.tableName,
					VALIDATION_STATE_MACHINE:
						validationStateMachine.stateMachineArn,
				},
			}
		);

		const athenaJobStatusFn = new lambdaPython.PythonFunction(
			this,
			'AthenaJobStatusFn',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'athena-job-status.py',
				entry: '../functions/eventbridge',
				timeout: cdk.Duration.minutes(15),
				environment: {
					REGION: awsRegion,
				},
			}
		);

		glueJobStatusFn.role?.attachInlinePolicy(
			new Policy(this, 'GlueJobStatusFnPolicy', {
				statements: [
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
					iam.ssmGetParameterPolicy,
					iam.awsGluePolicy,
					iam.awsGluePolicyTest,
					iam.stateMachinePolicy,
				],
			})
		);

		athenaJobStatusFn.role?.attachInlinePolicy(
			new Policy(this, 'AthenaJobStatusFnPolicy', {
				statements: [
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
					iam.ssmGetParameterPolicy,
					iam.awsGluePolicy,
					iam.awsGluePolicyTest,
					iam.stateMachinePolicy,
					iam.athenaPolicy,
					sqsPolicy,
				],
			})
		);

		athenaJobStatusFn.role?.attachInlinePolicy(
			new Policy(this, 'AthenaJobStatusFnInlinePolicy', {
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
						],
						resources: ['*'],
					}),
				],
			})
		);

		new cdk.aws_events.Rule(this, `GlueJobStatusRule`, {
			eventPattern: {
				source: [`aws.glue`],
				detailType: ['Glue Job State Change'],
			},
			targets: [
				new cdk.aws_events_targets.LambdaFunction(glueJobStatusFn),
			],
		});

		new cdk.aws_events.Rule(this, `AthenaJobStatusRule`, {
			eventPattern: {
				source: [`aws.athena`],
				detailType: ['Athena Query State Change'],
			},
			targets: [
				new cdk.aws_events_targets.LambdaFunction(athenaJobStatusFn),
			],
		});
	}
}
