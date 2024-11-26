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
import * as logs from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Vpc, ISubnet } from 'aws-cdk-lib/aws-ec2';

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface CognitoWebNativeConstructProps extends cdk.StackProps {}

export class Shared extends Construct {
	public vpc: Vpc;
	public subnets: ISubnet[];
	public securityGroup: string;

	constructor(
		parent: Construct,
		name: string,
		props: CognitoWebNativeConstructProps
	) {
		super(parent, name);

		const vpcLogs = new logs.LogGroup(this, 'VpcFlowLogs', {
			logGroupName: '/aws/vpc/flow-logs',
			removalPolicy: RemovalPolicy.DESTROY,
		});

		const availabilityZones = cdk.Stack.of(this).availabilityZones;

		const vpc = new ec2.Vpc(this, `Vpc`, {
			ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
			natGateways: 1,
			maxAzs: availabilityZones.length,
			flowLogs: {
				s3: {
					destination:
						ec2.FlowLogDestination.toCloudWatchLogs(vpcLogs),
					trafficType: ec2.FlowLogTrafficType.ALL,
				},
			},
			subnetConfiguration: [
				{
					name: 'private-subnet-',
					subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
					cidrMask: 24,
				},
				{
					name: 'public-subnet-',
					subnetType: ec2.SubnetType.PUBLIC,
					cidrMask: 24,
				},
			],
		});

		new ec2.GatewayVpcEndpoint(this, 'VpcEndpointS3', {
			service: ec2.GatewayVpcEndpointAwsService.S3,
			vpc,
		});

		const subnets = vpc.privateSubnets;
		const securityGroup = vpc.vpcDefaultSecurityGroup;

		new cdk.CfnOutput(this, 'VpcId', {
			value: vpc.vpcId,
			exportName: 'VpcId',
		});

		// assign public properties
		this.vpc = vpc;
		this.subnets = subnets;
		this.securityGroup = securityGroup;
	}
}
