/**
 * Copyright 2025 Amazon.com, Inc. and its affiliates. All Rights Reserved.
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

import { useState, useEffect } from 'react';
import * as React from 'react';
import {
	Box,
	Button,
	SpaceBetween,
	Header,
	TextFilter,
	Modal,
	Alert,
	StatusIndicator,
} from '@cloudscape-design/components';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { paginationLabels } from '../../components/labels';
import { TableHeader } from '../../components/common-components';
import Pagination from '@cloudscape-design/components/pagination';
import Table from '@cloudscape-design/components/table';
import { API } from 'aws-amplify';
import { originsSelectionLabels } from '../../components/labels';
import { useCollection } from '@cloudscape-design/collection-hooks';
import ExpandableSection from '@cloudscape-design/components/expandable-section';

function EmptyState({
	title,
	subtitle,
	action,
}: {
	title: any;
	subtitle: any;
	action: any;
}) {
	return (
		<Box textAlign="center" color="inherit">
			<Box variant="strong" textAlign="center" color="inherit">
				{title}
			</Box>
			<Box variant="p" padding={{ bottom: 's' }} color="inherit">
				{subtitle}
			</Box>
			{action}
		</Box>
	);
}

export function ViewViews(
	this: any,
	{
		archiveState,
		setArchiveState,
	}: {
		archiveState: any;
		setArchiveState: any;
	}
) {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [selectedItems, setSelectedItems] = useState<any[]>([]);
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState('');
	const [copiedViewName, setCopiedViewName] = useState<string | null>(null);

	let archive: any = {};
	archive = useParams();

	const refresh = () => {
		setSelectedItems([]);
		setLoading(true);
		getData();
	};

	const [preferences] = useState({
		pageSize: 10,
	});

	const [data, setData] = useState<any[]>([]);

	const getData = async () => {
		try {
			const requestData = {
				body: {
					archive_id: String(archive.id),
				},
			};
			const response = await API.post(
				'api',
				'/api/archive/views/list',
				requestData
			);
			setData(response.views || []);
			setLoading(false);
		} catch (error) {
			console.error('Error fetching views:', error);
			setData([]);
			setLoading(false);
		}
	};

	const handleDeleteView = async () => {
		if (selectedItems.length === 0) return;

		setDeleting(true);
		setDeleteError('');

		try {
			const viewToDelete = selectedItems[0];
			const requestData = {
				body: {
					archive_id: String(archive.id),
					view_name: viewToDelete.name,
				},
			};

			await API.post('api', '/api/archive/views/delete', requestData);

			setDeleteModalVisible(false);
			setSelectedItems([]);
			refresh();
		} catch (error: any) {
			console.error('Error deleting view:', error);
			setDeleteError(
				error.response?.data?.message ||
					'Failed to delete view. Please try again.'
			);
		} finally {
			setDeleting(false);
		}
	};

	const handleCopySQL = (sql: string, viewName: string) => {
		navigator.clipboard.writeText(sql).then(() => {
			setCopiedViewName(viewName);
			setTimeout(() => setCopiedViewName(null), 2000);
		});
	};

	useEffect(() => {
		getData();
	}, []);

	const columnDefinitions = [
		{
			id: 'name',
			header: t('views.viewName'),
			cell: (item: any) => item.name || '-',
			sortingField: 'name',
		},
		{
			id: 'columns',
			header: t('views.columns'),
			cell: (item: any) => item.columns?.length || 0,
		},
		{
			id: 'created_time',
			header: t('views.createdTime'),
			cell: (item: any) =>
				item.created_time
					? new Date(item.created_time).toLocaleString()
					: '-',
			sortingField: 'created_time',
		},
		{
			id: 'view_definition',
			header: t('views.viewDefinition'),
			cell: (item: any) => (
				<ExpandableSection
					headerText={t('views.showSQL')}
					headerActions={
						item.view_original_text &&
						(copiedViewName === item.name ? (
							<StatusIndicator type="success">
								{t('views.copied')}
							</StatusIndicator>
						) : (
							<Button
								iconName="copy"
								variant="inline-icon"
								onClick={() => {
									const fullSQL = `CREATE OR REPLACE VIEW ${item.name} AS\n${item.view_original_text}`;
									handleCopySQL(fullSQL, item.name);
								}}
								ariaLabel="Copy SQL to clipboard"
							>
								{t('views.copy')}
							</Button>
						))
					}
				>
					<Box
						variant="code"
						padding={{ vertical: 's', horizontal: 's' }}
					>
						<pre
							style={{
								margin: 0,
								whiteSpace: 'pre-wrap',
								wordBreak: 'break-word',
								fontFamily: 'monospace',
								fontSize: '12px',
								maxHeight: '400px',
								overflow: 'auto',
							}}
						>
							{item.view_original_text
								? `CREATE OR REPLACE VIEW ${item.name} AS\n${item.view_original_text}`
								: 'N/A'}
						</pre>
					</Box>
				</ExpandableSection>
			),
		},
	];

	const {
		items,
		actions,
		filteredItemsCount,
		collectionProps,
		filterProps,
		paginationProps,
	} = useCollection(data, {
		filtering: {
			empty: (
				<EmptyState
					title={t('views.noViews')}
					subtitle={t('views.noViewsCreated')}
					action={null}
				/>
			),
			noMatch: (
				<EmptyState
					title={t('views.noMatches')}
					subtitle={t('views.noMatchesSubtitle')}
					action={
						<Button onClick={() => actions.setFiltering('')}>
							{t('views.clearFilter')}
						</Button>
					}
				/>
			),
		},
		pagination: { pageSize: preferences.pageSize },
		sorting: {},
		selection: {},
	});

	return (
		<>
			<SpaceBetween size="xl">
				{archiveState === 'Archived' ? (
					<Table
						{...collectionProps}
						onSelectionChange={({ detail }) =>
							setSelectedItems(detail.selectedItems)
						}
						selectedItems={selectedItems}
						loading={loading}
						loadingText={t('views.loadingViews')}
						columnDefinitions={columnDefinitions}
						items={items}
						selectionType="single"
						header={
							<TableHeader
								title={t('views.title')}
								selectedItems={selectedItems}
								totalItems={data}
								actionButtons={
									<SpaceBetween
										direction="horizontal"
										size="xs"
									>
										<Button
											iconName="refresh"
											onClick={refresh}
										/>
										<Button
											disabled={
												selectedItems.length === 0
											}
											onClick={() =>
												setDeleteModalVisible(true)
											}
										>
											{t('views.deleteView')}
										</Button>
									</SpaceBetween>
								}
							/>
						}
						filter={
							<TextFilter
								{...filterProps}
								filteringPlaceholder={t('views.findViews')}
							/>
						}
						pagination={
							<Pagination
								{...paginationProps}
								ariaLabels={paginationLabels}
							/>
						}
					/>
				) : (
					<Alert type="info">
						<StatusIndicator type="info">
							{t('views.viewsOnlyAvailable')}
						</StatusIndicator>
					</Alert>
				)}
			</SpaceBetween>

			<Modal
				onDismiss={() => setDeleteModalVisible(false)}
				visible={deleteModalVisible}
				footer={
					<Box float="right">
						<SpaceBetween direction="horizontal" size="xs">
							<Button
								variant="link"
								onClick={() => setDeleteModalVisible(false)}
							>
								{t('common.cancel')}
							</Button>
							<Button
								variant="primary"
								onClick={handleDeleteView}
								loading={deleting}
							>
								{t('common.delete')}
							</Button>
						</SpaceBetween>
					</Box>
				}
				header={t('views.deleteView')}
			>
				{deleteError && (
					<Alert type="error" dismissible>
						{deleteError}
					</Alert>
				)}
				<SpaceBetween size="m">
					<Box variant="span">
						{t('views.deleteConfirmMessage')}{' '}
						<Box variant="strong">{selectedItems[0]?.name}</Box>?{' '}
						{t('views.deleteCannotUndo')}
					</Box>
				</SpaceBetween>
			</Modal>
		</>
	);
}
