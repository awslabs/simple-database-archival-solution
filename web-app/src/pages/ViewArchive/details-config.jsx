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

import moment from 'moment';
import { StatusIndicator } from '@cloudscape-design/components';

function runTime(startOn, endOn) {
	if (endOn !== undefined) {
		startOn = moment(startOn);
		endOn = moment(endOn);
		var diff_seconds = endOn.diff(startOn, 'seconds');
		return moment
			.utc(moment.duration(diff_seconds, 'seconds').asMilliseconds())
			.format('H:mm:ss');
	} else {
		return 'Running';
	}
}

export const JOB_EXECUTION_COLUMN_DEFINITION = [
	{
		id: 'job_run_id',
		header: 'Job ID',
		cell: (item) => item.job_run_id,
	},
	{
		id: 'timestamp',
		header: 'Started On',
		cell: (item) => moment(item.timestamp).format('M/D/YYYY - hh:mm:ss'),
	},
	{
		id: 'state',
		header: 'Status',
		cell: (item) => {
			if (item.state === 'SUCCEEDED') {
				return (
					<StatusIndicator type="success">
						{item.state}
					</StatusIndicator>
				);
			} else if (item.state === 'RUNNING') {
				return (
					<StatusIndicator type="info">{item.state}</StatusIndicator>
				);
			} else if (item.state === 'FAILED') {
				return (
					<StatusIndicator type="error">{item.state}</StatusIndicator>
				);
			}
		},
	},
];

export const JOB_DESCRIPTION_DEFINITION = [
	{
		id: 'job_name',
		header: 'Job Name',
		cell: (e) => e.job_name || '',
		sortingField: 'job_name',
	},
	{
		id: 'run_time',
		header: 'Run Time',
		cell: (item) => runTime(item.started_on, item.completed_on),
		sortingField: 'run_time',
	},
	{
		id: 'message',
		header: 'Message',
		cell: (item) => item.message || '',
		sortingField: 'message',
	},
];

export const VALIDATION_TABLE_EXECUTION_COLUMN_DEFINITION = [
	{
		id: 'table',
		header: 'Table Name',
		cell: (item) => item.table,
	},
];

export const CARD_INFORMATION_DEFINITION = [
	{
		id: 'key',
		header: 'Field',
		cell: (e) => e.key || '',
		sortingField: 'name',
	},
	{
		id: 'alt',
		header: 'Data Type',
		cell: (item) => item.value || '',
		sortingField: 'alt',
	},
];

export const REQUEST_EXECUTION_COLUMN_DEFINITION = [
	{
		id: 'table',
		header: 'Table Name',
		cell: (item) => item.table,
	},

	{
		id: 'schema',
		header: 'Number Schema',
		cell: (item) => item.schema.length,
	},
];
