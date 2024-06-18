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

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
	Button,
	SpaceBetween,
	Modal,
	Box,
	TextFilter,
	Table,
	Pagination,
} from '@cloudscape-design/components';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { API } from 'aws-amplify';
import { ARCHIVES_COLUMN_DEFINITIONS } from './details-config';
import { TableHeader } from '../../components/common-components';
import { paginationLabels } from '../../components/labels';

export function ArchivesTable() {
	const [visible, setVisible] = useState(false);
	const [deleteModal, setDeleteModal] = useState(false);
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selectedItems, setSelectedItems] = useState([]);
	const isSelected = selectedItems.length === 1;

	const refresh = () => {
		setSelectedItems([]);
		setLoading(true);
	};

	const closeDeleteModel = () => {
		setDeleteModal(false);
	};

	const [preferences, setPreferences] = useState({
		pageSize: 15,
		visibleContent: [
			'name',
			'id',
			'type',
			'database_engine',
			'archive_status',
		],
	});

	const deleteItem = async () => {
		setDeleteModal(true);
	};

	const confirmDeleteItem = async () => {
		setDeleteModal(false);
		const data = {
			body: {
				archive_id: selectedItems[0].id,
			},
		};
		await API.post('api', '/api/archive/delete', data);
		refresh();
	};

	useEffect(() => {
		const getData = async () => {
			const response = await API.get('api', '/api/archives/list');
			response.data.sort(function (a, b) {
				return new Date(b.time_submitted) - new Date(a.time_submitted);
			});
			setData(response.data);
			setLoading(false);
		};
		getData();
	}, [loading]);

	const { items, actions, filterProps, paginationProps } = useCollection(
		data,
		{
			pagination: { pageSize: preferences.pageSize },
			sorting: {},
			selection: {},
		}
	);

	return (
		<>
			<Table
				columnDefinitions={ARCHIVES_COLUMN_DEFINITIONS}
				loading={loading}
				selectedItems={selectedItems}
				loadingText="Loading archives"
				selectionType="single"
				counter={
					selectedItems.length
						? `(${selectedItems.length}/${data.length})`
						: `(${data.length})`
				}
				onSelectionChange={(event) => {
					setSelectedItems(event.detail.selectedItems);
				}}
				header={
					<TableHeader
						title="Archives"
						selectedItems={selectedItems}
						totalItems={data}
						variant="awsui-h1-sticky"
						actionButtons={
							<SpaceBetween direction="horizontal" size="xs">
								<Link
									to={
										isSelected
											? `/view/${selectedItems[0].id}/view/${selectedItems[0].archive_name}/view/${selectedItems[0].time_submitted}/view/${selectedItems[0].archive_status}/view/${selectedItems[0].mode}`
											: `#`
									}
								>
									<Button disabled={!isSelected}>
										View details
									</Button>
								</Link>

								<Button
									onClick={deleteItem}
									disabled={!isSelected}
								>
									Delete
								</Button>
								<Button
									onClick={refresh}
									iconAlign="right"
									variant="primary"
									iconName="refresh"
								>
									Refresh
								</Button>
							</SpaceBetween>
						}
					/>
				}
				visibleColumns={preferences.visibleContent}
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
						filteringAriaLabel="Filter instances"
						filteringPlaceholder="Find Archives"
					/>
				}
				empty={
					<Box textAlign="center" color="inherit">
						<Box
							padding={{ bottom: 's' }}
							variant="p"
							color="inherit"
						>
							<b>No archives to display</b>
						</Box>
					</Box>
				}
			/>

			<Modal
				onDismiss={() => closeDeleteModel(false)}
				visible={deleteModal}
				closeAriaLabel="Close modal"
				footer={
					<Box float="right">
						<SpaceBetween direction="horizontal" size="xs">
							<Button onClick={closeDeleteModel} variant="link">
								Cancel
							</Button>
							<Button
								onClick={confirmDeleteItem}
								variant="primary"
							>
								Yes
							</Button>
						</SpaceBetween>
					</Box>
				}
				header="Delete Confirmation"
			>
				<p>
					Delete Archive ID:
					{isSelected ? ` ${selectedItems[0].id}` : ``}
				</p>
				<p>
					<strong>
						Deleting this archive will NOT delete the data on Amazon
						S3 or any of the associated AWS Glue jobs.
					</strong>
				</p>
			</Modal>
		</>
	);
}
