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

import Moment from 'react-moment';
import Badge from '@cloudscape-design/components/badge';

export const ARCHIVES_COLUMN_DEFINITIONS = [
	{
		id: 'name',
		header: 'Archive Name',
		cell: (item) => item.archive_name,
	},

	{
		id: 'id',
		header: 'Archive ID',
		cell: (item) => item.id,
	},

	{
		id: 'type',
		header: 'Time Submitted',
		cell: (item) => (
			<Moment format="MMMM D, YYYY - h:mm:ss a">
				{item.time_submitted}
			</Moment>
		),
	},
	{
		id: 'archive_status',
		header: 'Status',
		cell: (item) => {
			if (item.archive_status === 'Failed') {
				return <Badge color="red">Failed</Badge>;
			} else if (item.archive_status === 'Intake Queue') {
				return <Badge>Intake Queue</Badge>;
			} else if (item.archive_status === 'Validating') {
				return <Badge color="blue">Validating</Badge>;
			} else if (item.archive_status === 'Archiving') {
				return <Badge color="blue">Archiving</Badge>;
			} else if (item.archive_status === 'Archive Queue') {
				return <Badge>Archive Queue</Badge>;
			} else if (item.archive_status === 'Stage Queue') {
				return <Badge>Stage Queue</Badge>;
			} else if (item.archive_status === 'Staging Archive') {
				return <Badge color="blue">Staging Archive</Badge>;
			} else if (item.archive_status === 'Validation Queue') {
				return <Badge>Validation Queue</Badge>;
			} else if (item.archive_status === 'Archived') {
				return <Badge color="green">Archived</Badge>;
			}
		},
	},
];
