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
import { S3BucketConstruct } from '../constructs/s3-bucket-construct';
import * as athena from 'aws-cdk-lib/aws-athena';

export class Athena extends Construct {
	constructor(
		scope: Construct,
		id: string,
		athenaTempBucket: S3BucketConstruct
	) {
		super(scope, id);

		new athena.CfnWorkGroup(this, 'SdasWorkGroup', {
			name: 'sdas',
			description: 'Query results from SDAS Front-end',
			recursiveDeleteOption: true,
			state: 'ENABLED',
			workGroupConfiguration: {
				enforceWorkGroupConfiguration: true,
				resultConfiguration: {
					encryptionConfiguration: {
						encryptionOption: 'SSE_S3',
					},
					outputLocation: `s3://${athenaTempBucket.bucketName}`,
				},
			},
		});
	}
}
