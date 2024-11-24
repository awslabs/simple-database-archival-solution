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

import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { AmplifyConfigLambdaConstruct } from './constructs/amplify-config-lambda-construct';
import { CloudFrontS3WebSiteConstruct } from './constructs/cloudfront-s3-website-construct';
import { SsmParameterReaderConstruct } from './constructs/ssm-parameter-reader-construct';

import { Authentication } from './authentication';
import { Shared } from './shared';
import { Tables } from './tables';
import { Buckets } from './buckets';
import { Apis } from './apis';
import { Iam } from './iam';
import { Pipelines } from './pipelines';
import { Athena } from './athena';

export interface AppStackProps extends cdk.StackProps {
	readonly ssmWafArnParameterName: string;
	readonly ssmWafArnParameterRegion: string;
}

export class AppStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: AppStackProps) {
		super(scope, id, props);

		const webAppBuildPath = '../web-app/build';
		const awsAccountId = cdk.Stack.of(this).account;
		const awsRegion = cdk.Stack.of(this).region;

		const authentication = new Authentication(
			this,
			'Authentication',
			props
		);
		const shared = new Shared(this, 'Shared', props);
		const tables = new Tables(this, 'Tables');
		const buckets = new Buckets(this, 'Buckets');

		const cfWafWebAcl = new SsmParameterReaderConstruct(
			this,
			'SsmWafParameter',
			{
				ssmParameterName: props.ssmWafArnParameterName,
				ssmParameterRegion: props.ssmWafArnParameterRegion,
			}
		).getValue();

		const website = new CloudFrontS3WebSiteConstruct(
			this,
			'UserInterface',
			{
				webSiteBuildPath: webAppBuildPath,
				webAclArn: cfWafWebAcl,
			}
		);

		const iam = new Iam(
			this,
			'IAM',
			awsRegion,
			awsAccountId,
			tables.archivesTable,
			tables.queryLookupTable,
			tables.fetchSchemaTable,
			buckets.athenaTempBucket,
			buckets.archiveDataBucket,
			buckets.glueAssetBucket,
			buckets.glueTempBucket
		);

		const apis = new Apis(this, 'APIs', {
			iam: iam,
			website: website,
			authentication: authentication,
			shared: shared,
			tables: tables,
			awsRegion: awsRegion,
		});

		new AmplifyConfigLambdaConstruct(this, 'AmplifyConfigFn', {
			api: apis.api.apiGatewayV2,
			appClientId: authentication.webClientId,
			identityPoolId: authentication.identityPoolId,
			userPoolId: authentication.userPoolId,
		});

		new Pipelines(
			this,
			'Pipelines',
			awsAccountId,
			awsRegion,
			shared,
			apis,
			iam,
			buckets,
			tables
		);

		new Athena(this, 'Athena', buckets.athenaTempBucket);
	}
}
