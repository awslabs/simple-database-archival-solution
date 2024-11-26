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
import { Archive } from './archive';
import { Shared } from '../shared';
import { Apis } from '../apis';
import { Iam } from '../iam';
import { Buckets } from '../buckets';
import { Validation } from './validation';
import { Tables } from '../tables';

export class Pipelines extends Construct {
	constructor(
		scope: Construct,
		id: string,
		awsAccountId: string,
		awsRegion: string,
		shared: Shared,
		apis: Apis,
		iam: Iam,
		buckets: Buckets,
		tables: Tables
	) {
		super(scope, id);

		new Archive(
			this,
			'Archive',
			awsAccountId,
			awsRegion,
			shared,
			apis,
			iam,
			buckets
		);

		new Validation(
			this,
			'Validation',
			awsAccountId,
			awsRegion,
			iam,
			tables
		);
	}
}
