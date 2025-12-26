/**
 * Copyright 2025 Amazon.com, Inc. and its affiliates. All Rights Reserved.
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
import i18n from '../../i18n';

export const ARCHIVES_COLUMN_DEFINITIONS = [
	{
		id: 'name',
		header: i18n.t('archive.archiveName'),
		cell: (item) => item.archive_name,
	},

	{
		id: 'id',
		header: i18n.t('archive.archiveId'),
		cell: (item) => item.id,
	},

	{
		id: 'type',
		header: i18n.t('archive.timeSubmitted'),
		cell: (item) => (
			<Moment format="MMMM D, YYYY - h:mm:ss a">
				{item.time_submitted}
			</Moment>
		),
	},
	{
		id: 'archive_status',
		header: i18n.t('common.status'),
		cell: (item) => {
			if (item.archive_status === 'Failed') {
				return (
					<Badge color="red">{i18n.t('archive.statusFailed')}</Badge>
				);
			} else if (item.archive_status === 'Intake Queue') {
				return <Badge>{i18n.t('archive.statusIntakeQueue')}</Badge>;
			} else if (item.archive_status === 'Validating') {
				return (
					<Badge color="blue">
						{i18n.t('archive.statusValidating')}
					</Badge>
				);
			} else if (item.archive_status === 'Archiving') {
				return (
					<Badge color="blue">
						{i18n.t('archive.statusArchiving')}
					</Badge>
				);
			} else if (item.archive_status === 'Archive Queue') {
				return <Badge>{i18n.t('archive.statusArchiveQueue')}</Badge>;
			} else if (item.archive_status === 'Stage Queue') {
				return <Badge>{i18n.t('archive.statusStageQueue')}</Badge>;
			} else if (item.archive_status === 'Staging Archive') {
				return (
					<Badge color="blue">
						{i18n.t('archive.statusStagingArchive')}
					</Badge>
				);
			} else if (item.archive_status === 'Validation Queue') {
				return <Badge>{i18n.t('archive.statusValidationQueue')}</Badge>;
			} else if (item.archive_status === 'Archived') {
				return (
					<Badge color="green">
						{i18n.t('archive.statusArchived')}
					</Badge>
				);
			}
		},
	},
];
