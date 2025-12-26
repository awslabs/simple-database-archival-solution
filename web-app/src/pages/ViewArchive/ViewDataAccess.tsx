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

/* eslint-disable no-useless-escape */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API } from 'aws-amplify';
import {
	SpaceBetween,
	Container,
	Header,
	Link,
	CodeEditorProps,
	Table,
	Box,
	Button,
	TextFilter,
	ExpandableSection,
	Spinner,
	StatusIndicator,
} from '@cloudscape-design/components';
import { useCollection } from '@cloudscape-design/collection-hooks';
import Pagination from '@cloudscape-design/components/pagination';
import { paginationLabels } from '../../components/labels';
import { TableHeader } from '../../components/common-components';
import { originsSelectionLabels } from '../../components/labels';
import { VALIDATION_TABLE_EXECUTION_COLUMN_DEFINITION } from './details-config';
// import '../../styles/base.scss';
// import '../../styles/top-navigation.scss';
import CodeEditor from '@awsui/components-react/code-editor';
import { ViewFullDataAccess } from './ViewFullDataAccess';

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

export function ViewData(
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
	const [ace, setAce] = useState<typeof import('ace-builds') | undefined>(
		undefined
	);
	const [aceLoading, setAceLoading] = useState(true);
	const [sqlStatement, setSqlStatement] = useState(
		t('dataAccess.selectTable')
	);
	const [loading, setLoading] = useState(true);
	const [selectedItems, setSelectedItems] = useState<any[]>([]);
	const [isSelected, setIsSelected] = useState(selectedItems.length === 1);
	const [data, setData] = useState<any[]>([]);
	const [fullData, setFullData] = useState<any>({});
	const [preferences] = useState({
		pageSize: 10,
	});
	const [columnDefinitionsState, setColumnDefinitionsState] = useState<any[]>(
		[]
	);
	const [tableRows, setTableRows] = useState<any[]>([]);
	const [gettingQuery, setGettingQuery] = useState(false);
	const [gettingQueryFailed, setGettingQueryFailed] = useState(false);

	const [codeEditorPreferences, setCodeEditorPreferences] =
		useState<CodeEditorProps.Preferences>({
			wrapLines: false,
			theme: 'dracula',
		});

	const handleCodeEditorPreferencesChange = (
		pref: CodeEditorProps.Preferences
	) => {
		setCodeEditorPreferences(pref);
	};

	const i18nStrings = {
		loadingState: t('validationPage.codeEditorLoading'),
		errorState: t('validationPage.codeEditorError'),
		errorStateRecovery: t('validationPage.retry'),

		editorGroupAriaLabel: t('validationPage.editorGroupAriaLabel'),
		statusBarGroupAriaLabel: t('validationPage.statusBarGroupAriaLabel'),

		cursorPosition: (row: any, column: any) =>
			t('validationPage.cursorPosition', { row, column }),
		errorsTab: t('validationPage.errorsTab'),
		warningsTab: t('validationPage.warningsTab'),
		preferencesButtonAriaLabel: t(
			'validationPage.preferencesButtonAriaLabel'
		),

		paneCloseButtonAriaLabel: t('validationPage.paneCloseButtonAriaLabel'),

		preferencesModalHeader: t('validationPage.preferencesModalHeader'),
		preferencesModalCancel: t('validationPage.preferencesModalCancel'),
		preferencesModalConfirm: t('validationPage.preferencesModalConfirm'),
		preferencesModalWrapLines: t(
			'validationPage.preferencesModalWrapLines'
		),
		preferencesModalTheme: t('validationPage.preferencesModalTheme'),
		preferencesModalLightThemes: t(
			'validationPage.preferencesModalLightThemes'
		),
		preferencesModalDarkThemes: t(
			'validationPage.preferencesModalDarkThemes'
		),
	};

	let archive: any = {};
	archive = useParams();

	const getData = async () => {
		const data = {
			body: {
				archive_id: String(archive.id),
			},
		};
		const response = await API.post('api', '/api/archive/get', data);
		setArchiveState(response.Item.archive_status);

		// Get tables
		const tables = response.Item.table_details || [];

		// Get views
		let views = [];
		try {
			const viewsResponse = await API.post(
				'api',
				'/api/archive/views/list',
				data
			);
			views = (viewsResponse.views || []).map((view: any) => ({
				table: view.name,
				type: 'view',
				columns: view.columns,
			}));
		} catch (error) {
			console.error('Error fetching views:', error);
		}

		// Combine tables and views
		setData([...tables, ...views]);
		setFullData(response.Item);
		setLoading(false);
	};

	const formalSqlStatement = (data: any) => {
		const validationQueueindicator = archiveState === 'Archived';

		if (validationQueueindicator) {
			// Use simplified table name - backend will transform it automatically
			const simplifiedQuery = `SELECT * FROM ${data[0]['table']} LIMIT 10;`;
			setSqlStatement(simplifiedQuery);
			return simplifiedQuery;
		} else {
			return '';
		}
	};

	const executeQuery = async () => {
		setGettingQuery(true);
		setGettingQueryFailed(false);
		const data = {
			body: {
				sql_statement: sqlStatement,
				archive_id: String(archive.id),
			},
		};
		await API.post('api', '/api/archive/query', data)
			.then((response) => {
				const tableHeaders: any = [];
				const tableRows: any = [];

				// Get table headers
				for (const header in response['ResultSet']['Rows'][0]) {
					for (const column in response['ResultSet']['Rows'][0][
						header
					]) {
						const columnName =
							response['ResultSet']['Rows'][0][header][column][
								'VarCharValue'
							];
						tableHeaders.push({
							id: columnName,
							header: columnName,
							cell: (item: any) => item[columnName] || '-',
							sortingField: columnName,
						});
					}
				}

				setColumnDefinitionsState(tableHeaders);

				for (const rows in response['ResultSet']['Rows']) {
					if (rows !== '0') {
						for (const row in response['ResultSet']['Rows'][rows]) {
							const rowValues: any = [];
							const rowKeys: any = {};

							for (const keys in tableHeaders) {
								const key = tableHeaders[keys].id;
								rowKeys[key] =
									response['ResultSet']['Rows'][rows][row][
										keys
									]['VarCharValue'];
							}
							tableRows.push(rowKeys);
						}
					}
				}
				setTableRows(tableRows);
			})
			.catch(() => {
				setGettingQueryFailed(true);
			});

		setGettingQuery(false);
	};

	useEffect(() => {
		getData();
	}, [loading]);

	useEffect(() => {
		import('ace-builds')
			.then((ace) =>
				import('ace-builds/webpack-resolver')
					.then(() => {
						ace.config.set('useStrictCSP', true);
						ace.config.set('loadWorkerFromBlob', false);
						setAce(ace);
						setAceLoading(false);
					})
					.catch(() => {
						setAceLoading(false);
					})
			)
			.catch(() => {
				setAceLoading(false);
			});
	}, []);

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
					title={t('common.noInstances')}
					subtitle={t('common.noInstancesToDisplay')}
					action={<Button>{t('common.createInstance')}</Button>}
				/>
			),
			noMatch: (
				<EmptyState
					title={t('common.noMatches')}
					subtitle={t('common.noMatchesSubtitle')}
					action={
						<Button onClick={() => actions.setFiltering('')}>
							{t('common.clearFilter')}
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
		<SpaceBetween size="xl">
			<ViewFullDataAccess
				archiveState={archiveState}
				fullData={fullData}
				loading={loading}
			/>

			<Table
				className="origins-table"
				ariaLabels={originsSelectionLabels}
				columnDefinitions={VALIDATION_TABLE_EXECUTION_COLUMN_DEFINITION}
				selectedItems={selectedItems}
				loading={loading}
				loadingText={t('dataAccess.loadingTables')}
				selectionType="single"
				onSelectionChange={({ detail }) => {
					setAceLoading(true);
					setIsSelected(true);
					setSelectedItems((detail.selectedItems as any) || []);
					setSqlStatement(
						formalSqlStatement(detail.selectedItems as any)
					);
					setAceLoading(false);
				}}
				empty={
					<Box textAlign="center" color="inherit">
						<b>{t('dataAccess.noResources')}</b>
						<Box
							padding={{ bottom: 's' }}
							variant="p"
							color="inherit"
						>
							{t('dataAccess.noResourcesToDisplay')}
						</Box>
					</Box>
				}
				header={
					<TableHeader
						title={t('dataAccess.dataPreview')}
						selectedItems={selectedItems}
						totalItems={data}
						selectionType="single"
						counter={
							selectedItems.length
								? `(${selectedItems.length}/${data.length})`
								: `(0/${data.length})`
						}
						actionButtons={
							<SpaceBetween
								direction="horizontal"
								size="xs"
							></SpaceBetween>
						}
					/>
				}
				items={items}
				pagination={
					<Pagination
						{...paginationProps}
						ariaLabels={paginationLabels}
					/>
				}
				filter={
					<TextFilter
						{...filterProps}
						filteringAriaLabel={t('dataAccess.filterTables')}
						filteringPlaceholder={t('dataAccess.findTables')}
					/>
				}
			/>

			<ExpandableSection header={t('dataAccess.singleTableQuery')}>
				<SpaceBetween size="l">
					<Container
						header={
							<Header
								variant="h2"
								description={t(
									'dataAccess.singleTableDescription'
								)}
							>
								{t('dataAccess.singleTableQueryEditor')}
							</Header>
						}
						footer={
							<SpaceBetween direction="vertical" size="s">
								{gettingQueryFailed ? (
									<StatusIndicator type="error">
										{t('dataAccess.queryFailed')}
									</StatusIndicator>
								) : (
									<></>
								)}
								{gettingQuery ? (
									<Button variant="primary">
										<Spinner />
									</Button>
								) : (
									<Button
										onClick={executeQuery}
										variant="primary"
									>
										{t('dataAccess.executeQuery')}
									</Button>
								)}
							</SpaceBetween>
						}
					>
						<CodeEditor
							ace={ace}
							loading={aceLoading}
							editorContentHeight={200}
							language="sql"
							value={sqlStatement}
							preferences={undefined}
							onPreferencesChange={({ detail }) =>
								handleCodeEditorPreferencesChange(detail)
							}
							i18nStrings={i18nStrings}
						/>
					</Container>
					<Table
						columnDefinitions={columnDefinitionsState}
						items={tableRows}
						loadingText={t('dataAccess.loadingResults')}
						sortingDisabled
						empty={
							<Box textAlign="center" color="inherit">
								<b>{t('dataAccess.noResources')}</b>
								<Box
									padding={{ bottom: 's' }}
									variant="p"
									color="inherit"
								>
									{t('dataAccess.noResourcesToDisplay')}
								</Box>
							</Box>
						}
						header={<Header>{t('dataAccess.results')}</Header>}
					/>
				</SpaceBetween>
			</ExpandableSection>
		</SpaceBetween>
	);
}
