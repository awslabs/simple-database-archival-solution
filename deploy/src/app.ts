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

import { CfWafStack } from './cf-waf-stack';
import { AppStack } from './app-stack';
import { AwsSolutionsChecks } from 'cdk-nag';
import { suppressCdkNagRules } from './cdk-nag-suppressions';

const app = new cdk.App();

const account =
	app.node.tryGetContext('account') ||
	process.env.CDK_DEPLOY_ACCOUNT ||
	process.env.CDK_DEFAULT_ACCOUNT;
const region =
	app.node.tryGetContext('region') ||
	process.env.CDK_DEPLOY_REGION ||
	process.env.CDK_DEFAULT_REGION;

// Deploy Waf for CloudFront in us-east-1
const cfWafStackName = 'WAFStack';

const cfWafStack = new CfWafStack(app, cfWafStackName, {
	env: {
		account: account,
		region: 'us-east-1',
	},
	stackName: cfWafStackName,
});

// Deploy Main Stack
const mainStackName = 'MainStack';
const appStack = new AppStack(app, mainStackName, {
	env: {
		account: account,
		region: region,
	},
	stackName: mainStackName,
	ssmWafArnParameterName: cfWafStack.ssmWafArnParameterName,
	ssmWafArnParameterRegion: cfWafStack.region,
});

appStack.addDependency(cfWafStack);

// Add AWS Solutions Checks and suppress rules
cdk.Aspects.of(app).add(new AwsSolutionsChecks({ logIgnores: true }));
suppressCdkNagRules(cfWafStack);
suppressCdkNagRules(appStack);

app.synth();
