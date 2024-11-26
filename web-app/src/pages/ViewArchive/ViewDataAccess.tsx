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

/* eslint-disable no-useless-escape */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
	const [ace, setAce] = useState<typeof import('ace-builds') | undefined>(
		undefined
	);
	const [aceLoading, setAceLoading] = useState(true);
	const [sqlStatement, setSqlStatement] = useState('Please select a table');
	const [loading, setLoading] = useState(true);
	const [selectedItems, setSelectedItems] = useState([]);
	const [isSelected, setIsSelected] = useState(selectedItems.length === 1);
	const [data, setData] = useState([]);
	const [fullData, setFullData] = useState({});
	const [preferences] = useState({
		pageSize: 10,
	});
	const [columnDefinitionsState, setColumnDefinitionsState] = useState([]);
	const [tableRows, setTableRows] = useState([]);
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

	const getData = async () => {
		const data = {
			body: {
				archive_id: String(archive.id),
			},
		};
		const response = await API.post('api', '/api/archive/get', data);
		setArchiveState(response.Item.archive_status);
		setData(response.Item.table_details);
		setFullData(response.Item);
		setLoading(false);
	};

	const formalSqlStatement = (data: any) => {
		const validationQueueindicator = archiveState === 'Archived';

		if (validationQueueindicator) {
			setSqlStatement(
				`SELECT * FROM \"${fullData['id']}-${fullData[
					'database'
				].toLowerCase()}-database\".\"${fullData['id']}-${fullData[
					'database'
				].toLowerCase()}-${data[0]['table']}-table\" limit 10;`
			);

			return `SELECT * FROM \"${fullData['id']}-${fullData[
				'database'
			].toLowerCase()}-database\".\"${fullData['id']}-${fullData[
				'database'
			].toLowerCase()}-${data[0]['table']}-table\" limit 10;`;
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
						tableHeaders.push({
							id: response['ResultSet']['Rows'][0][header][
								column
							]['VarCharValue'],
							header: response['ResultSet']['Rows'][0][header][
								column
							]['VarCharValue'],
							cell: (item: { name: any }) =>
								item[
									response['ResultSet']['Rows'][0][header][
										column
									]['VarCharValue']
								] || '-',
							sortingField: 'name',
						});
					}
				}

				setColumnDefinitionsState(tableHeaders);

				for (const rows in response['ResultSet']['Rows']) {
					if (rows !== '0') {
						for (const row in response['ResultSet']['Rows'][rows]) {
							const rowValues: any = [];
							const rowKeys = {};

							for (const keys in tableHeaders) {
								const key = tableHeaders[keys].id;
								rowKeys[key] =
									response['ResultSet']['Rows'][rows][row][
										keys
									]['VarCharValue'];
								rowKeys['description'] =
									'This is the first item';
								rowKeys['type'] = '1A';
								rowKeys['size'] = 'Small';
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
						ace.config.set('readOnly', false);
						ace.config.set('maxLines', 0);
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
					title="No instances"
					subtitle="No instances to display."
					action={<Button>Create instance</Button>}
				/>
			),
			noMatch: (
				<EmptyState
					title="No matches"
					subtitle="We can’t find a match."
					action={
						<Button onClick={() => actions.setFiltering('')}>
							Clear filter
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
			<Container
				header={
					<Header
						variant="h2"
						description="You can access the archived data by using the AWS Management Console, 
            a JDBC or ODBC connection, the Athena API, the Athena CLI, the AWS SDK, or AWS Tools for 
            Windows PowerShell."
					>
						Full Data Access
					</Header>
				}
			>
				<Link
					href="https://docs.aws.amazon.com/athena/latest/ug/accessing-ate.html"
					external
					variant="info"
				>
					Accessing Athena
				</Link>
			</Container>

			<Table
				className="origins-table"
				ariaLabels={originsSelectionLabels}
				columnDefinitions={VALIDATION_TABLE_EXECUTION_COLUMN_DEFINITION}
				selectedItems={selectedItems}
				loading={loading}
				loadingText="Loading Tables"
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
						<b>No resources</b>
						<Box
							padding={{ bottom: 's' }}
							variant="p"
							color="inherit"
						>
							No resources to display.
						</Box>
					</Box>
				}
				header={
					<TableHeader
						title="Data Preview"
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
						filteringAriaLabel="Filter Tables"
						filteringPlaceholder="Find Tables"
					/>
				}
			/>

			<ExpandableSection header="Query">
				<SpaceBetween size="l">
					<Container
						header={
							<Header
								variant="h2"
								description="The query editor is limited to 10 rows of data access."
							>
								Query Editor
							</Header>
						}
						footer={
							<SpaceBetween direction="vertical" size="s">
								{gettingQueryFailed ? (
									<StatusIndicator type="error">
										Failed to Execute Query
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
										Execute Query
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
							//   onDelayedChange={({ detail }) => console.log(detail)}
							i18nStrings={i18nStrings}
						/>
					</Container>
					<Table
						columnDefinitions={columnDefinitionsState}
						items={tableRows}
						loadingText="Loading resources"
						sortingDisabled
						empty={
							<Box textAlign="center" color="inherit">
								<b>No resources</b>
								<Box
									padding={{ bottom: 's' }}
									variant="p"
									color="inherit"
								>
									No resources to display.
								</Box>
							</Box>
						}
						header={<Header> Results </Header>}
					/>
				</SpaceBetween>
			</ExpandableSection>
		</SpaceBetween>
	);
}
