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
import { useParams } from 'react-router-dom';
import { API } from 'aws-amplify';
import { useTranslation } from 'react-i18next';
import {
	SpaceBetween,
	Container,
	Header,
	CodeEditorProps,
	Table,
	Box,
	Button,
	Spinner,
	Alert,
} from '@cloudscape-design/components';
import CodeEditor from '@awsui/components-react/code-editor';

export function ViewFullDataAccess({
	archiveState,
	fullData,
	loading,
}: {
	archiveState: any;
	fullData: any;
	loading?: boolean;
}) {
	const { t } = useTranslation();
	const [ace, setAce] = useState<typeof import('ace-builds') | undefined>(
		undefined
	);
	const [aceLoading, setAceLoading] = useState(true);
	const [sqlStatement, setSqlStatement] = useState('');
	const [gettingQuery, setGettingQuery] = useState(false);
	const [gettingQueryFailed, setGettingQueryFailed] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const [messageType, setMessageType] = useState<'success' | 'info'>(
		'success'
	);
	const [columnDefinitionsState, setColumnDefinitionsState] = useState([]);
	const [tableRows, setTableRows] = useState([]);
	const [nextToken, setNextToken] = useState<string | null>(null);
	const [queryExecutionId, setQueryExecutionId] = useState<string | null>(
		null
	);
	const [currentPage, setCurrentPage] = useState(1);
	const [hasMorePages, setHasMorePages] = useState(false);
	const [downloadingCsv, setDownloadingCsv] = useState(false);
	const [downloadError, setDownloadError] = useState('');

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
		loadingState: 'Loading code editor',
		errorState: 'There was an error loading the code editor.',
		errorStateRecovery: 'Retry',

		editorGroupAriaLabel: 'Code editor',
		statusBarGroupAriaLabel: 'Status bar',

		cursorPosition: (row: any, column: any) => `Ln ${row}, Col ${column}`,
		errorsTab: 'Errors',
		warningsTab: 'Warnings',
		preferencesButtonAriaLabel: 'Preferences',

		paneCloseButtonAriaLabel: 'Close',

		preferencesModalHeader: 'Preferences',
		preferencesModalCancel: 'Cancel',
		preferencesModalConfirm: 'Confirm',
		preferencesModalWrapLines: 'Wrap lines',
		preferencesModalTheme: 'Theme',
		preferencesModalLightThemes: 'Light themes',
		preferencesModalDarkThemes: 'Dark themes',
	};

	let archive: any = {};
	archive = useParams();

	const executeQuery = async (isNewQuery = true) => {
		if (isNewQuery && !sqlStatement.trim()) {
			setGettingQueryFailed(true);
			setErrorMessage('SQL query is required');
			return;
		}

		setGettingQuery(true);
		setGettingQueryFailed(false);
		setErrorMessage('');
		setSuccessMessage('');

		// Reset state for new queries
		if (isNewQuery) {
			setTableRows([]);
			setColumnDefinitionsState([]);
			setNextToken(null);
			setQueryExecutionId(null);
			setCurrentPage(1);
			setHasMorePages(false);
		}

		const requestBody: any = {
			archive_id: String(archive.id),
			page_size: 50,
		};

		// For new queries, include the SQL statement
		if (isNewQuery) {
			requestBody.sql_statement = sqlStatement;
		} else {
			// For pagination, reuse the query_execution_id and provide next_token
			requestBody.query_execution_id = queryExecutionId;
			requestBody.next_token = nextToken;
		}

		const data = {
			body: requestBody,
		};

		try {
			const response = await API.post(
				'api',
				'/api/archive/query-full',
				data
			);

			const tableHeaders: any = [];
			const tableRows: any = [];

			// Store query_execution_id and next_token for pagination
			if (response['QueryExecutionId']) {
				setQueryExecutionId(response['QueryExecutionId']);
			}

			if (response['NextToken']) {
				setNextToken(response['NextToken']);
				setHasMorePages(true);
			} else {
				setNextToken(null);
				setHasMorePages(false);
			}

			// Check if this is a DDL statement (CREATE, DROP, ALTER) that returns UpdateCount instead of rows
			// UpdateCount exists for DDL/DML statements (value can be 0)
			const hasUpdateCount = 'UpdateCount' in response;
			const hasResultRows =
				response['ResultSet'] &&
				response['ResultSet']['Rows'] &&
				response['ResultSet']['Rows'].length > 0;

			// Get table headers
			if (hasResultRows) {
				// Parse headers from the first row (Athena always includes header row)
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

				// Only set column definitions for new queries (not pagination)
				if (isNewQuery) {
					setColumnDefinitionsState(tableHeaders);
				}

				// Get table rows (always skip row 0 which is the header)
				// Athena includes the header row in every paginated response
				for (const rows in response['ResultSet']['Rows']) {
					if (rows !== '0') {
						// Skip header row
						for (const row in response['ResultSet']['Rows'][rows]) {
							const rowKeys: any = {};

							// Use the tableHeaders we just parsed (or existing columnDefinitionsState for pagination)
							const headersToUse = isNewQuery
								? tableHeaders
								: columnDefinitionsState;

							for (const keys in headersToUse) {
								const key = headersToUse[keys].id;
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
			} else if (hasUpdateCount) {
				// DDL statements (CREATE VIEW, DROP TABLE, etc.) return UpdateCount instead of rows
				setTableRows([]);
				setColumnDefinitionsState([]);
				setGettingQueryFailed(false);
				setSuccessMessage(
					'Query executed successfully. DDL statement completed.'
				);
				// Query succeeded but no results to display (this is expected for DDL)
			} else {
				// Query returned no results and no UpdateCount
				setTableRows([]);
				setColumnDefinitionsState([]);
				// Don't treat empty SELECT results as an error
			}
		} catch (error: any) {
			setGettingQueryFailed(true);
			if (error.response && error.response.data) {
				const errorData =
					typeof error.response.data === 'string'
						? JSON.parse(error.response.data)
						: error.response.data;
				setErrorMessage(
					errorData.message ||
						errorData.error ||
						'Failed to execute query'
				);
			} else {
				setErrorMessage(
					'Failed to execute query. Please check your SQL syntax.'
				);
			}
		} finally {
			setGettingQuery(false);
		}
	};

	const handleNextPage = async () => {
		if (hasMorePages && nextToken) {
			setCurrentPage((prev) => prev + 1);
			await executeQuery(false);
		}
	};

	const handlePreviousPage = () => {
		// Note: Athena doesn't support backward pagination with NextToken
		// This would require caching previous page tokens
		// For now, user needs to re-run the query to go back
		alert(
			'Previous page navigation requires re-running the query. This is a limitation of Amazon Athena pagination.'
		);
	};

	const handleDownloadCsv = async () => {
		if (!queryExecutionId) {
			setDownloadError(
				'No query results available to download. Please execute a query first.'
			);
			return;
		}

		setDownloadingCsv(true);
		setDownloadError('');

		const requestBody = {
			query_execution_id: queryExecutionId,
		};

		const data = {
			body: requestBody,
		};

		try {
			const response = await API.post(
				'api',
				'/api/archive/download',
				data
			);

			// Open the presigned URL in a new window to trigger download
			if (response.download_url) {
				window.location.href = response.download_url;
			} else {
				setDownloadError('Failed to generate download URL');
			}
		} catch (error: any) {
			if (error.response && error.response.data) {
				const errorData =
					typeof error.response.data === 'string'
						? JSON.parse(error.response.data)
						: error.response.data;
				setDownloadError(
					errorData.message ||
						errorData.error ||
						'Failed to download CSV'
				);
			} else {
				setDownloadError('Failed to download CSV. Please try again.');
			}
		} finally {
			setDownloadingCsv(false);
		}
	};

	useEffect(() => {
		import('ace-builds')
			.then((ace) =>
				import('ace-builds/webpack-resolver')
					.then(() => {
						// Import SQL mode for syntax highlighting
						import('ace-builds/src-noconflict/mode-sql');

						// Import popular themes
						import('ace-builds/src-noconflict/theme-dracula');
						import('ace-builds/src-noconflict/theme-monokai');
						import('ace-builds/src-noconflict/theme-github');
						import('ace-builds/src-noconflict/theme-tomorrow');
						import('ace-builds/src-noconflict/theme-twilight');
						import('ace-builds/src-noconflict/theme-clouds');

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

	// Generate example SQL when component loads (only once when data becomes available)
	useEffect(() => {
		// Only run once when fullData becomes available and we haven't set SQL yet
		if (
			!loading &&
			sqlStatement === '' &&
			fullData &&
			fullData['id'] &&
			fullData['database'] &&
			fullData['table_details']
		) {
			const fetchViewsAndGenerateSQL = async () => {
				// List all available tables with their simplified names
				const tables = fullData['table_details'];
				const tableList = tables
					.map((t: any) => `--   ${t.table}`)
					.join('\n');

				// Fetch views
				let viewsList = '';
				try {
					const data = {
						body: {
							archive_id: String(fullData['id']),
						},
					};
					const viewsResponse = await API.post(
						'api',
						'/api/archive/views/list',
						data
					);
					const views = viewsResponse.views || [];
					if (views.length > 0) {
						viewsList =
							'\n\n-- Available views:\n' +
							views.map((v: any) => `--   ${v.name}`).join('\n');
					}
				} catch (error) {
					console.error(
						'Error fetching views for SQL editor:',
						error
					);
				}

				const exampleSql = `-- Available tables (use simplified names):
${tableList}${viewsList}

-- Example: Query with JOINs and filters
-- Note: You can use simplified table names - the backend transforms them automatically!

SELECT *
FROM public.table
LIMIT 100;`;
				setSqlStatement(exampleSql);
			};

			fetchViewsAndGenerateSQL();
		}
	}, [loading, fullData]);

	const isArchived = archiveState === 'Archived';

	return (
		<SpaceBetween size="l">
			{!isArchived && (
				<Alert type="warning" header={t('dataAccess.archiveNotReady')}>
					{t('dataAccess.archiveNotReadyMessage')} {archiveState}
				</Alert>
			)}

			<Container
				header={
					<Header
						variant="h2"
						description={t('dataAccess.sqlQueryEditorDescription')}
					>
						{t('dataAccess.sqlQueryEditor')}
					</Header>
				}
				footer={
					<SpaceBetween direction="vertical" size="s">
						{successMessage && (
							<Alert
								type={messageType}
								header={
									messageType === 'info'
										? 'Loading'
										: 'Success'
								}
								dismissible
								onDismiss={() => setSuccessMessage('')}
							>
								{successMessage}
							</Alert>
						)}
						{gettingQueryFailed && (
							<Alert
								type="error"
								header="Query Failed"
								dismissible
								onDismiss={() => {
									setGettingQueryFailed(false);
									setErrorMessage('');
								}}
							>
								{errorMessage}
							</Alert>
						)}
						{loading ? (
							<Button variant="primary" disabled>
								<Spinner /> {t('dataAccess.loadingSampleQuery')}
							</Button>
						) : gettingQuery ? (
							<Button variant="primary" disabled>
								<Spinner /> {t('dataAccess.executingQuery')}
							</Button>
						) : (
							<Button
								onClick={() => executeQuery(true)}
								variant="primary"
								disabled={!isArchived}
							>
								{t('dataAccess.executeQuery')}
							</Button>
						)}
					</SpaceBetween>
				}
			>
				<CodeEditor
					ace={ace}
					loading={aceLoading || loading}
					editorContentHeight={300}
					language="sql"
					value={sqlStatement}
					onChange={({ detail }) => setSqlStatement(detail.value)}
					preferences={undefined}
					onPreferencesChange={({ detail }) =>
						handleCodeEditorPreferencesChange(detail)
					}
					i18nStrings={i18nStrings}
				/>
			</Container>

			<Container
				header={
					<Header
						variant="h2"
						description={
							tableRows.length > 0
								? t('dataAccess.showingRows', {
										count: tableRows.length,
										page: currentPage,
								  })
								: t('dataAccess.executeQueryToSeeResults')
						}
						actions={
							queryExecutionId && (
								<SpaceBetween direction="vertical" size="xs">
									{downloadError && (
										<Alert
											type="error"
											dismissible
											onDismiss={() =>
												setDownloadError('')
											}
										>
											{downloadError}
										</Alert>
									)}
									<SpaceBetween
										direction="horizontal"
										size="xs"
									>
										<Button
											onClick={handleDownloadCsv}
											loading={downloadingCsv}
											disabled={
												downloadingCsv ||
												!queryExecutionId
											}
											iconName="download"
										>
											{t(
												'dataAccess.downloadFullResults'
											)}
										</Button>
									</SpaceBetween>
								</SpaceBetween>
							)
						}
					>
						{t('dataAccess.queryResults')}
					</Header>
				}
				footer={
					tableRows.length > 0 ? (
						<Box float="right">
							<SpaceBetween direction="horizontal" size="xs">
								<Button
									onClick={handlePreviousPage}
									disabled={currentPage === 1}
								>
									{t('common.previous')}
								</Button>
								<Box
									variant="span"
									padding={{
										horizontal: 's',
										vertical: 'xs',
									}}
								>
									{t('dataAccess.page')} {currentPage}
								</Box>
								<Button
									onClick={handleNextPage}
									disabled={!hasMorePages || gettingQuery}
									loading={gettingQuery}
								>
									{t('common.next')}
								</Button>
							</SpaceBetween>
						</Box>
					) : undefined
				}
			>
				<div style={{ maxHeight: '600px', overflowY: 'auto' }}>
					<Table
						columnDefinitions={columnDefinitionsState}
						items={tableRows}
						loadingText={t('dataAccess.loadingResults')}
						loading={gettingQuery}
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
						wrapLines
					/>
				</div>
			</Container>
		</SpaceBetween>
	);
}
