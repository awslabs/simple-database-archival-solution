/**
 * Copyright 2023 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *   http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import * as cdk from 'aws-cdk-lib';
import * as apigwv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import * as apigw from '@aws-cdk/aws-apigatewayv2-alpha';
import * as lambdaPython from '@aws-cdk/aws-lambda-python-alpha';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ApiGatewayV2LambdaConstruct } from './apigatewayv2-lambda-construct';

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface DasApiPythonConstructProps extends cdk.StackProps {
	readonly name: string;
	readonly runtime: cdk.aws_lambda.Runtime;
	readonly handler: string;
	readonly index: string;
	readonly entry: string;
	readonly timeout: cdk.Duration;
	readonly environment: any;
	readonly routePath: string;
	readonly methods: Array<apigwv2.HttpMethod>;
	readonly api: apigw.HttpApi;
	readonly iamInlinePolicy?: Array<iam.PolicyStatement>;
}

const defaultProps: Partial<DasApiPythonConstruct> = {};

export class DasApiPythonConstruct extends Construct {
	constructor(
		parent: Construct,
		name: string,
		props: DasApiPythonConstructProps
	) {
		super(parent, name);

		/* eslint-disable @typescript-eslint/no-unused-vars */
		props = { ...defaultProps, ...props };

		const lambdaPythonFunction = new lambdaPython.PythonFunction(
			this,
			props.name + 'Fn',
			{
				runtime: props.runtime,
				handler: props.handler,
				index: props.index,
				entry: props.entry,
				timeout: props.timeout,
				environment: props.environment,
			}
		);

		new ApiGatewayV2LambdaConstruct(this, props.name + 'ApiGateway', {
			lambdaFn: lambdaPythonFunction,
			routePath: props.routePath,
			methods: props.methods,
			api: props.api,
		});

		if (props.iamInlinePolicy) {
			lambdaPythonFunction.role?.attachInlinePolicy(
				new iam.Policy(this, props.name + 'Policy', {
					statements: props.iamInlinePolicy,
				})
			);
		}
	}
}
