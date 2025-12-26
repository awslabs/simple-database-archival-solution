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

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	SpaceBetween,
	Box,
	Button,
	Table,
	Pagination,
	TextFilter,
	Header,
	Cards,
	ExpandableSection,
} from '@cloudscape-design/components';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { API } from 'aws-amplify';
import { JOB_EXECUTION_COLUMN_DEFINITION } from './details-config';
import { JOB_DESCRIPTION_DEFINITION } from './details-config';
import { TableHeader } from '../../components/common-components';
import { originsSelectionLabels } from '../../components/labels';
import { paginationLabels } from '../../components/labels';

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

export function ViewJobs({
	archiveState,
	setArchiveState,
}: {
	archiveState: any;
	setArchiveState: any;
}) {
	const { t } = useTranslation();
	let archive: any = {};
	archive = useParams();

	const [selectedItems, setSelectedItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [isSelected, setIsSelected] = useState(selectedItems.length === 1);
	const [data, setData] = useState([]);
	const [connection, setConnection] = useState<WebSocket | null>(null);

	useEffect(() => {
		const data = {
			body: {
				archive_id: archive.id,
			},
		};

		const getData = async () => {
			const response = await API.post('api', '/api/archive/get', data);
			setArchiveState(response.Item.archive_status);
			setData(Object.values(response.Item.jobs));
			setLoading(false);
		};

		getData();
	}, [loading]);

	const refresh = () => {
		setIsSelected(false);
		setLoading(true);
	};

	const [preferences] = useState({
		pageSize: 20,
	});

	const { items, actions, filterProps, paginationProps } = useCollection(
		data,
		{
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
		}
	);

	return (
		<SpaceBetween size="xl">
			<Table
				className="origins-table"
				ariaLabels={originsSelectionLabels}
				columnDefinitions={JOB_EXECUTION_COLUMN_DEFINITION}
				selectedItems={selectedItems}
				loading={loading}
				loadingText={t('jobs.loadingJobs')}
				selectionType="single"
				onSelectionChange={(event) => {
					setIsSelected(true);
					setSelectedItems((event.detail.selectedItems as any) || []);
				}}
				empty={
					<Box textAlign="center" color="inherit">
						<Box
							padding={{ bottom: 's' }}
							variant="p"
							color="inherit"
						>
							<b>{t('jobs.noJobs')}</b>
						</Box>
					</Box>
				}
				header={
					<TableHeader
						title={t('jobs.jobDescription')}
						selectedItems={selectedItems}
						totalItems={data}
						counter={
							selectedItems.length
								? `(${selectedItems.length}/${data.length})`
								: `(${data.length})`
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
						filteringAriaLabel={t('jobs.filterJobs')}
						filteringPlaceholder={t('jobs.findJobs')}
					/>
				}
			/>
			<Cards
				cardDefinition={{
					header: (e) => (selectedItems[0] as any).job_name,
					sections: [
						{
							id: 'description',
							content: (e) => {
								return (
									<ExpandableSection
										header={t('jobs.details')}
									>
										<Table
											columnDefinitions={
												JOB_DESCRIPTION_DEFINITION
											}
											items={selectedItems}
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
											header={<TableHeader />}
										/>
									</ExpandableSection>
								);
							},
						},
					],
				}}
				cardsPerRow={[{ cards: 1 }, { minWidth: 500, cards: 1 }]}
				items={isSelected ? selectedItems : []}
				loadingText={t('jobs.loadingJobInformation')}
				header={<Header>{t('jobs.jobInformation')}</Header>}
			/>
		</SpaceBetween>
	);
}
