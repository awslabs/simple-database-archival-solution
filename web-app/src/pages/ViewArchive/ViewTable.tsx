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

import { useState, useEffect, useRef } from 'react';
import * as React from 'react';
import {
	Box,
	Button,
	SpaceBetween,
	Header,
	TextFilter,
	Cards,
} from '@cloudscape-design/components';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	CARD_INFORMATION_DEFINITION,
	REQUEST_EXECUTION_COLUMN_DEFINITION,
} from './details-config';
// import '../../styles/base.scss';
// import '../../styles/top-navigation.scss';
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

export function ViewTable(
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
	const [name, setName] = useState('');
	const [toolsOpen, setToolsOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [currentPageIndex, setCurrentPageIndex] = React.useState(1);
	const inputRef = useRef(null);
	const [selectedItems, setSelectedItems] = useState([]);
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
		<>
			<SpaceBetween size="xl">
				<Table
					className="origins-table"
					ariaLabels={originsSelectionLabels}
					columnDefinitions={REQUEST_EXECUTION_COLUMN_DEFINITION}
					selectedItems={selectedItems}
					loading={loading}
					loadingText={t('tables.loadingTables')}
					selectionType="single"
					onSelectionChange={(event) => {
						setIsSelected(true);
						setSelectedItems(
							(event.detail.selectedItems as any) || []
						);
					}}
					empty={
						<Box textAlign="center" color="inherit">
							<b>{t('tables.loadingResources')}</b>
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
							title={t('tables.tableDescription')}
							selectedItems={selectedItems}
							totalItems={data}
							selectionType="single"
							loadHelpPanelContent={() => {
								setToolsOpen(true);
							}}
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
										{t('common.refresh')}
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
							filteringAriaLabel={t('tables.filterTables')}
							filteringPlaceholder={t('tables.findTables')}
						/>
					}
				/>

				<Cards
					cardDefinition={{
						header: (e) =>
							'mssql_schema' in (selectedItems[0] as any)
								? (selectedItems[0] as any).mssql_schema +
								  '.' +
								  (selectedItems[0] as any).table
								: (selectedItems[0] as any).table,

						sections: [
							{
								id: 'description',
								content: (e) => {
									return (
										<ExpandableSection
											header={t('tables.tableSchema')}
										>
											<Table
												columnDefinitions={
													CARD_INFORMATION_DEFINITION
												}
												items={
													selectedItems[0]['schema']
												}
												loadingText={t(
													'tables.loadingResources'
												)}
												sortingDisabled
												variant="embedded"
												empty={
													<Box
														textAlign="center"
														color="inherit"
													>
														<b>
															{t(
																'dataAccess.noResources'
															)}
														</b>
														<Box
															padding={{
																bottom: 's',
															}}
															variant="p"
															color="inherit"
														>
															{t(
																'dataAccess.noResourcesToDisplay'
															)}
														</Box>
													</Box>
												}
												header={
													<TableHeader
														loadHelpPanelContent={() => {
															setToolsOpen(false);
														}}
													/>
												}
											/>
										</ExpandableSection>
									);
								},
							},
						],
					}}
					cardsPerRow={[{ cards: 1 }, { minWidth: 500, cards: 1 }]}
					items={isSelected ? selectedItems : []}
					loadingText={t('tables.loadingSchema')}
					header={<Header>{t('tables.schemaInformation')}</Header>}
				/>
			</SpaceBetween>
		</>
	);
}
