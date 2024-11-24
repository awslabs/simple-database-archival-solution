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
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface DynamoDBTableProps {
	tableName: string;
	partitionKey: { name: string; type: dynamodb.AttributeType };
	sortKey?: { name: string; type: dynamodb.AttributeType };
	timeToLiveAttribute?: string;
}

export class DynamoDBTableConstruct extends Construct {
	public readonly table: dynamodb.Table;

	constructor(scope: Construct, id: string, props: DynamoDBTableProps) {
		super(scope, id);

		// Create the DynamoDB table
		this.table = new dynamodb.Table(this, props.tableName, {
			tableName: props.tableName,
			partitionKey: props.partitionKey,
			sortKey: props.sortKey,
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			pointInTimeRecovery: true,
			timeToLiveAttribute: props.timeToLiveAttribute,
		});
	}
}
