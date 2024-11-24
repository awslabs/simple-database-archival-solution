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
import { Policy } from 'aws-cdk-lib/aws-iam';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Shared } from '../../shared';
import { Apis } from '../../apis';
import { Iam } from '../../iam';
import { Buckets } from '../../buckets';

export class Archive extends Construct {
	constructor(
		scope: Construct,
		id: string,
		awsAccountId: string,
		awsRegion: string,
		shared: Shared,
		apis: Apis,
		iam: Iam,
		buckets: Buckets
	) {
		super(scope, id);

		const stepFunctionGlueStepOne = new lambdaPython.PythonFunction(
			this,
			'StepFunctionGlueStepOne',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'step-one-start-status.py',
				entry: '../step-functions/aws-glue-job',
				timeout: cdk.Duration.minutes(5),
				environment: {
					REGION: awsRegion,
				},
			}
		);

		const stepFunctionGlueStepTwo = new lambdaPython.PythonFunction(
			this,
			'StepFunctionGlueStepTwo',

			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'step-two-glue-connection.py',
				entry: '../step-functions/aws-glue-job',
				timeout: cdk.Duration.minutes(5),
				environment: {
					AVAILABILITY_ZONE: shared.subnets[0].availabilityZone,
					SUBNET_ID: shared.subnets[0].subnetId,
					RDS_SECURITY_GROUP: apis.rdsSecurityGroup.securityGroupId,
					VPC_DEFAULT_SECURITY_GROUP: shared.securityGroup,
					REGION: awsRegion,
				},
			}
		);

		const stepFunctionGlueStepThree = new lambdaPython.PythonFunction(
			this,
			'StepFunctionGlueStepThree',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'step-three-glue-database.py',
				entry: '../step-functions/aws-glue-job',
				timeout: cdk.Duration.minutes(5),
				environment: {
					REGION: awsRegion,
				},
			}
		);

		const stepFunctionGlueStepFour = new lambdaPython.PythonFunction(
			this,
			'StepFunctionGlueStepFour',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'step-four-glue-tables.py',
				entry: '../step-functions/aws-glue-job',
				timeout: cdk.Duration.minutes(5),
				environment: {
					REGION: awsRegion,
				},
			}
		);

		const stepFunctionGlueStepSix = new lambdaPython.PythonFunction(
			this,
			'StepFunctionGlueStepSix',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'step-six-glue-job.py',
				entry: '../step-functions/aws-glue-job',
				timeout: cdk.Duration.minutes(5),
				memorySize: 1024,
				environment: {
					REGION: awsRegion,
				},
			}
		);

		const stepFunctionGlueStepSeven = new lambdaPython.PythonFunction(
			this,
			'StepFunctionGlueStepSeven',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'step-seven-map-output.py',
				entry: '../step-functions/aws-glue-job',
				timeout: cdk.Duration.minutes(5),
				environment: {
					REGION: awsRegion,
				},
			}
		);

		const stepFunctionGlueStepNine = new lambdaPython.PythonFunction(
			this,
			'StepFunctionGlueStepNine',
			{
				runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
				handler: 'lambda_handler',
				index: 'step-nine-start-jobs.py',
				entry: '../step-functions/aws-glue-job',
				timeout: cdk.Duration.minutes(5),
				environment: {
					REGION: awsRegion,
				},
			}
		);

		stepFunctionGlueStepOne.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionGlueStepOnePolicy', {
				statements: [
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
					iam.ssmGetParameterPolicy,
				],
			})
		);

		stepFunctionGlueStepTwo.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionGlueStepTwoPolicy', {
				statements: [
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
					iam.ssmGetParameterPolicy,
					iam.awsGluePolicy,
					iam.secretsmanagerGetSecretValue,
				],
			})
		);

		stepFunctionGlueStepThree.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionGlueStepThreePolicy', {
				statements: [
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
					iam.ssmGetParameterPolicy,
					iam.awsGluePolicy,
				],
			})
		);

		stepFunctionGlueStepFour.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionGlueStepFourPolicy', {
				statements: [
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
					iam.ssmGetParameterPolicy,
					iam.awsGluePolicy,
				],
			})
		);

		stepFunctionGlueStepSix.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionGlueStepSixPolicy', {
				statements: [
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
					iam.ssmGetParameterPolicy,
					iam.awsGluePolicy,
					iam.awsGluePolicyTest,
				],
			})
		);

		stepFunctionGlueStepSeven.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionGlueStepSevenPolicy', {
				statements: [
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
					iam.ssmGetParameterPolicy,
					iam.awsGluePolicy,
					iam.awsGluePolicyTest,
				],
			})
		);

		stepFunctionGlueStepNine.role?.attachInlinePolicy(
			new Policy(this, 'StepFunctionGlueStepNinePolicy', {
				statements: [
					iam.dynamoDbWritePolicy,
					iam.dynamoDbReadOnlyPolicy,
					iam.ssmGetParameterPolicy,
					iam.awsGluePolicy,
					iam.awsGluePolicyTest,
				],
			})
		);

		const definition = new cdk.aws_stepfunctions_tasks.LambdaInvoke(
			this,
			'Step One - Start Status',
			{
				lambdaFunction: stepFunctionGlueStepOne,
				outputPath: '$.Payload',
			}
		)
			.next(
				new cdk.aws_stepfunctions_tasks.LambdaInvoke(
					this,
					'Step Two - Glue Connection',
					{
						lambdaFunction: stepFunctionGlueStepTwo,
						outputPath: '$.Payload',
					}
				)
			)
			.next(
				new cdk.aws_stepfunctions_tasks.LambdaInvoke(
					this,
					'Step Three - Glue Database',
					{
						lambdaFunction: stepFunctionGlueStepThree,
						outputPath: '$.Payload',
					}
				)
			)
			.next(
				new cdk.aws_stepfunctions_tasks.LambdaInvoke(
					this,
					'Step Four - Glue Tables',
					{
						lambdaFunction: stepFunctionGlueStepFour,
						outputPath: '$.Payload',
					}
				)
			)
			.next(
				new cdk.aws_stepfunctions.Map(
					this,
					'Step Five - Map Database Tables',
					{
						maxConcurrency: 10,
						itemsPath:
							cdk.aws_stepfunctions.JsonPath.stringAt(
								'$.Payload'
							),
					}
				).iterator(
					new cdk.aws_stepfunctions_tasks.LambdaInvoke(
						this,
						'Step Six - Glue Job',
						{
							lambdaFunction: stepFunctionGlueStepSix,
							outputPath: '$.Payload',
						}
					)
				)
			)
			.next(
				new cdk.aws_stepfunctions_tasks.LambdaInvoke(
					this,
					'Step Seven - Map Output',
					{
						lambdaFunction: stepFunctionGlueStepSeven,
						outputPath: '$.Payload',
					}
				)
			)
			.next(
				new cdk.aws_stepfunctions.Map(
					this,
					'Step Eight - Map Database Tables',
					{
						maxConcurrency: 10,
						itemsPath:
							cdk.aws_stepfunctions.JsonPath.stringAt(
								'$.Payload'
							),
					}
				).iterator(
					new cdk.aws_stepfunctions_tasks.LambdaInvoke(
						this,
						'Step Nine - Glue Job',
						{
							lambdaFunction: stepFunctionGlueStepNine,
							outputPath: '$.Payload',
						}
					)
				)
			);

		const logGroup = new cdk.aws_logs.LogGroup(
			this,
			'GlueStateMachineLog',
			{
				removalPolicy: RemovalPolicy.DESTROY,
			}
		);

		const stateMachine = new cdk.aws_stepfunctions.StateMachine(
			this,
			'GlueStateMachine',
			{
				definition,
				tracingEnabled: true,
				logs: {
					destination: logGroup,
					level: cdk.aws_stepfunctions.LogLevel.ALL,
				},
			}
		);

		const createStateMachineParam = new ssm.StringParameter(
			this,
			'CreateStateMachineParam',
			{
				parameterName: '/job/step-functions-state-machine',
				stringValue: `arn:aws:states:${awsRegion}:${awsAccountId}:stateMachine:${stateMachine.stateMachineName}`,
				description: 'Name for state machine',
				type: ssm.ParameterType.STRING,
				tier: ssm.ParameterTier.STANDARD,
				allowedPattern: '.*',
			}
		);

		new cdk.aws_s3_deployment.BucketDeployment(this, 'DeployFiles', {
			sources: [
				cdk.aws_s3_deployment.Source.asset('./assets/aws-glue-scripts'),
			],
			destinationBucket: buckets.glueAssetBucket.bucket,
		});
	}
}
