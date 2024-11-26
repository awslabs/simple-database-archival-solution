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
import { DynamoDBTableConstruct } from '../constructs/dynamodb-table-construct';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export class Tables extends Construct {
	public readonly archivesTable: DynamoDBTableConstruct;
	public readonly queryLookupTable: DynamoDBTableConstruct;
	public readonly fetchSchemaTable: DynamoDBTableConstruct;

	constructor(scope: Construct, id: string) {
		super(scope, id);

		// Create Archives Table
		this.archivesTable = new DynamoDBTableConstruct(this, 'ArchivesTable', {
			tableName: 'Archives',
			partitionKey: {
				name: 'id',
				type: cdk.aws_dynamodb.AttributeType.STRING,
			},
		});

		// Create Query Lookup Table
		this.queryLookupTable = new DynamoDBTableConstruct(
			this,
			'QueryLookupTable',
			{
				tableName: 'QueryLookup',
				partitionKey: {
					name: 'id',
					type: cdk.aws_dynamodb.AttributeType.STRING,
				},
			}
		);

		// Create Fetch Tables Schema Async Table
		this.fetchSchemaTable = new DynamoDBTableConstruct(
			this,
			'FetchSchemaTable',
			{
				tableName: 'FetchSchema',
				partitionKey: {
					name: 'id',
					type: cdk.aws_dynamodb.AttributeType.STRING,
				},
				timeToLiveAttribute: 'ttl',
			}
		);

		new ssm.StringParameter(this, 'DynamoDBTableParam', {
			parameterName: '/archive/dynamodb-table',
			stringValue: this.archivesTable.table.tableName,
			description: 'Table name for archives.',
			type: ssm.ParameterType.STRING,
			tier: ssm.ParameterTier.STANDARD,
			allowedPattern: '.*',
		});

		new ssm.StringParameter(this, 'QueryDynamoDBTableParam', {
			parameterName: '/archive/query-lookup-dynamodb-table',
			stringValue: this.queryLookupTable.table.tableName,
			description: 'Table name for validation query IDs.',
			type: ssm.ParameterType.STRING,
			tier: ssm.ParameterTier.STANDARD,
			allowedPattern: '.*',
		});
	}
}
