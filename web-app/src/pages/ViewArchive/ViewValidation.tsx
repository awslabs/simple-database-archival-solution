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

import { useState, useEffect, useRef } from 'react';
import * as React from 'react';
import {
	Box,
	Button,
	SpaceBetween,
	TextFilter,
	CodeEditorProps,
} from '@cloudscape-design/components';
import { useParams } from 'react-router-dom';
import { VALIDATION_TABLE_EXECUTION_COLUMN_DEFINITION } from './details-config';
// import '../../styles/base.scss';
// import '../../styles/top-navigation.scss';
import { paginationLabels } from '../../components/labels';
import { TableHeader } from '../../components/common-components';
import Pagination from '@cloudscape-design/components/pagination';
import { originsSelectionLabels } from '../../components/labels';
import Table from '@cloudscape-design/components/table';
import { API } from 'aws-amplify';
import { useCollection } from '@cloudscape-design/collection-hooks';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import CodeEditor from '@awsui/components-react/code-editor';
import 'ace-builds/css/ace.css';
import 'ace-builds/css/theme/dawn.css';
import 'ace-builds/css/theme/tomorrow_night_bright.css';

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

export function ValidationTable(
	this: any,
	{
		archiveState,
		setArchiveState,
	}: {
		archiveState: any;
		setArchiveState: any;
	}
) {
	const [name, setName] = useState('');
	const [toolsOpen, setToolsOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [fileUploading, setFileUploading] = useState(false);
	const [currentPageIndex, setCurrentPageIndex] = React.useState(1);
	const [checked, setChecked] = React.useState(false);
	const [disableDelete, setDisableDelete] = useState(true);
	const inputRef = useRef(null);
	const [selectedItems, setSelectedItems] = useState<any[]>([]);
	const [isSelected, setIsSelected] = useState(selectedItems.length === 1);
	const [visible, setVisible] = React.useState(true);

	let archive: any = {};
	archive = useParams();

	const refresh = () => {
		setSelectedItems([]);
		setIsSelected(false);
		setLoading(true);
		getData();
	};

	const [preferences, setPreferences] = useState({
		pageSize: 10,
	});

	const [data, setData] = useState([]);

	const getData = async () => {
		const data = {
			body: {
				archive_id: String(archive.id),
			},
		};
		const response = await API.post('api', '/api/archive/get', data);
		setArchiveState(response.Item.archive_status);
		setData(response.Item.table_details);
		setLoading(false);
	};

	useEffect(() => {
		getData();
	}, [loading]);

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

	const [codeEditorPreferences, setCodeEditorPreferences] =
		useState<CodeEditorProps.Preferences>({
			wrapLines: false,
			theme: 'dracula',
		});

	const [ace, setAce] = useState<typeof import('ace-builds') | undefined>(
		undefined
	);
	const [aceLoading, setAceLoading] = useState(true);

	useEffect(() => {
		import('ace-builds')
			.then((ace) =>
				import('ace-builds/webpack-resolver')
					.then(() => {
						ace.config.set('useStrictCSP', true);
						ace.config.set('loadWorkerFromBlob', false);
						ace.config.set('readOnly', true);
						ace.config.set('maxLines', 0);

						// ace.config.set('basePath', '/app/');
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

	const handleCodeEditorPreferencesChange = (
		pref: CodeEditorProps.Preferences
	) => {
		// import("ace-builds/css/theme/dawn.css");
		setCodeEditorPreferences(pref);
	};

	function checkValidation(isSelected: any, validationName: string) {
		const validationQueueindicator =
			archiveState === 'Archived' || archiveState === 'Validating';
		const validatingindicator = archiveState === 'Validating';

		if (!isSelected) {
			return 'Please select a table';
		} else if (isSelected && validationQueueindicator) {
			if (
				Object.values(selectedItems[0][validationName]).length === 0 ||
				selectedItems[0][validationName]['results'].length === 0
			) {
				return 'This Validation Is Not Available';
			} else {
				console.log(selectedItems[0]);
				return (
					selectedItems[0][validationName]['query'] +
					'\n' +
					'/* ' +
					validationName +
					' ' +
					(selectedItems[0][validationName]['results'][1]['Data'][0][
						'VarCharValue'
					] +
						' */')
				);
			}
		} else if (validatingindicator) {
			return 'Validation In-progress';
		} else {
			return 'Validation Is Not Ready';
		}
	}

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

	return (
		<>
			<SpaceBetween size="xl">
				<Table
					className="origins-table"
					ariaLabels={originsSelectionLabels}
					columnDefinitions={
						VALIDATION_TABLE_EXECUTION_COLUMN_DEFINITION
					}
					selectedItems={selectedItems}
					loading={loading}
					loadingText="Loading Tables"
					selectionType="single"
					onSelectionChange={({ detail }) => {
						setIsSelected(true);
						setSelectedItems((detail.selectedItems as any) || []);
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
							title="Table Description"
							selectedItems={selectedItems}
							totalItems={data}
							selectionType="single"
							loadHelpPanelContent={() => {
								setToolsOpen(true);
							}}
							// counter={
							//   selectedItems.length ? `(${data.length})` : `(${data.length})`
							// }
							counter={
								selectedItems.length
									? `(${selectedItems.length}/${data.length})`
									: `(0/${data.length})`
							}
							actionButtons={
								<SpaceBetween direction="horizontal" size="xs">
									<Button
										onClick={refresh}
										iconAlign="right"
										iconName="refresh"
									>
										Refresh
									</Button>
								</SpaceBetween>
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
							filteringAriaLabel="Filter Validations"
							filteringPlaceholder="Find Validations"
						/>
					}
				/>

				<ExpandableSection header="Validation Results">
					<SpaceBetween size="l">
						<CodeEditor
							ace={ace}
							editorContentHeight={70}
							language="sql"
							value={checkValidation(
								isSelected,
								'count_validation'
							)}
							preferences={undefined}
							loading={aceLoading}
							onPreferencesChange={({ detail }) =>
								handleCodeEditorPreferencesChange(detail)
							}
							i18nStrings={i18nStrings}
						/>

						<CodeEditor
							ace={ace}
							editorContentHeight={70}
							language="sql"
							value={checkValidation(
								isSelected,
								'number_validation'
							)}
							preferences={undefined}
							loading={aceLoading}
							onPreferencesChange={({ detail }) =>
								handleCodeEditorPreferencesChange(detail)
							}
							i18nStrings={i18nStrings}
						/>

						<CodeEditor
							ace={ace}
							editorContentHeight={70}
							language="sql"
							value={checkValidation(
								isSelected,
								'string_validation'
							)}
							preferences={undefined}
							loading={aceLoading}
							onPreferencesChange={({ detail }) =>
								handleCodeEditorPreferencesChange(detail)
							}
							i18nStrings={i18nStrings}
						/>
					</SpaceBetween>
				</ExpandableSection>
			</SpaceBetween>
		</>
	);
}
