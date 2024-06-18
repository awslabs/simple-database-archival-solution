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
import {
	AppLayout,
	Box,
	Button,
	SpaceBetween,
	Container,
	Header,
	Tabs,
	ColumnLayout,
	StatusIndicator,
	Spinner,
	Badge,
	Modal,
	FormField,
	Select,
	DatePicker,
	RadioGroup,
	Input,
} from '@cloudscape-design/components';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../components/common-components';
import { SideBarNavigation } from '../../components/SideBarNavigation';
import { API } from 'aws-amplify';
import Moment from 'react-moment';
import { ValidationTable } from './ViewValidation';
import { ViewCompliance } from './ViewCompliance';
import { ViewTable } from './ViewTable';
import { ViewData } from './ViewDataAccess';
import { ViewJobs } from './ViewJobs';

function EmptyState({ title, subtitle, action }) {
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

function ViewArchive() {
	let job = useParams();
	let archive = useParams();

	const [archiveModal, setArchiveModal] = useState(false);
	const [data] = useState([]);
	const [preferences] = useState({
		pageSize: 5,
		visibleContent: ['table'],
	});

	const [archiveNow, setArchiveNow] = useState('now');
	const [workerType, setWorkerType] = useState({
		label: 'G.1X',
		value: 'G.1X',
	});
	const [workerCapacity, setWorkerCapacity] = useState('');

	const [workerCapacityError, setWorkerCapacityError] = useState('');

	const [scheduleDate, setScheduleDate] = useState('');
	const [scheduleTime, setScheduleTime] = useState('');

	const [archiveState, setArchiveState] = useState('');

	const [loading, setLoading] = useState(true);
	const [archiveData, setArchiveData] = useState({
		Item: {
			database_engine: '',
			hostname: '',
		},
	});

	const refresh = () => {
		getData();
	};

	const getData = async () => {
		setLoading(true);
		const data = {
			body: {
				archive_id: String(job.id),
			},
		};
		const response = await API.post('api', '/api/archive/get', data);
		setArchiveData(response);
		setArchiveState(response.Item.archive_status);
		setWorkerCapacity(response.Item.configuration.glue.glue_capacity);
		setLoading(false);
	};

	const archiveItem = async () => {
		setArchiveModal(true);
	};

	const archiveRequest = async () => {
		closeArchiveModel();
		setLoading(true);
		const id = archive.id;
		const myInit = {
			body: {
				archive_id: id,
				worker_capacity: workerCapacity,
				worker_type: workerType.value,
				archive_schedule: {
					run_now: archiveNow === 'now' ? true : false,
					date: archiveNow === 'now' ? '' : scheduleDate,
					time: archiveNow === 'now' ? '' : scheduleTime,
				},
			},
		};
		await API.post('api', '/api/job/run', myInit);
		getData();
	};

	const closeArchiveModel = () => {
		setArchiveModal(false);
	};

	useEffect(() => {
		getData();
	}, []);

	const tabs = [
		{
			label: 'Table',
			id: 'request',
			content: (
				<ViewTable
					archiveState={archiveState}
					setArchiveState={setArchiveState}
				/>
			),
		},

		{
			label: 'Jobs',
			id: 'jobs',
			content: (
				<ViewJobs
					archiveState={archiveState}
					setArchiveState={setArchiveState}
				/>
			),
		},

		{
			label: 'Validation',
			id: 'validation',
			content: (
				<ValidationTable
					archiveState={archiveState}
					setArchiveState={setArchiveState}
				/>
			),
		},

		{
			label: 'Compliance',
			id: 'compliance',
			content: (
				<ViewCompliance
					archiveState={archiveState}
					setArchiveState={setArchiveState}
					archiveData={archiveData}
					setArchiveData={setArchiveData}
				/>
			),
		},
		{
			label: 'Data Access',
			id: 'dataaccess',
			content: (
				<ViewData
					archiveState={archiveState}
					setArchiveState={setArchiveState}
				/>
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
		<AppLayout
			contentType="default"
			contentHeader={
				<>
					<PageHeader buttons={[]} />
					<Header variant="h1">{job.archive_name}</Header>
				</>
			}
			content={
				<>
					<SpaceBetween size="l">
						{loading ? (
							<Container
								header={<Header variant="h2">Archive</Header>}
							>
								<Box textAlign="center" color="inherit">
									<Spinner size="large" />
									<Box
										padding={{ bottom: 's' }}
										variant="p"
										color="inherit"
									>
										Loading
									</Box>
								</Box>
							</Container>
						) : (
							<Container
								header={
									<Header
										actions={
											<SpaceBetween
												direction="horizontal"
												size="xs"
											>
												<Button
													onClick={archiveItem}
													disabled={
														archiveState ===
														'Archive Queue'
															? false
															: true
													}
												>
													Archive
												</Button>
												<Button
													onClick={refresh}
													iconAlign="right"
													iconName="refresh"
												>
													Refresh
												</Button>
											</SpaceBetween>
										}
										variant="h2"
									>
										Archive
									</Header>
								}
							>
								<ColumnLayout columns={2} variant="text-grid">
									<div>
										<Box variant="awsui-key-label">
											Hostname
										</Box>
										<div>{archiveData.Item.hostname}</div>
									</div>
									<div>
										<Box variant="awsui-key-label">
											Archive ID
										</Box>
										<div>{job.id}</div>
									</div>

									<div>
										<Box variant="awsui-key-label">
											Time Submitted
										</Box>
										<div>
											{' '}
											<Moment
												format="MMMM D YYYY, hh:mm a"
												date={job.time_submitted}
												utc
												local
											></Moment>
										</div>
									</div>

									<div>
										<Box variant="awsui-key-label">
											Archive Status
										</Box>

										<div>
											{' '}
											{archiveState === 'Failed' ? (
												<Badge color="red">
													Failed
												</Badge>
											) : archiveState === 'Archiving' ? (
												<Badge color="blue">
													Archiving
												</Badge>
											) : archiveState ===
											  'Validating' ? (
												<Badge color="blue">
													Validating
												</Badge>
											) : archiveState ===
											  'Archive Queue' ? (
												<Badge>Archive Queue</Badge>
											) : archiveState === 'Archived' ? (
												<Badge color="green">
													Archived
												</Badge>
											) : (
												<Badge> </Badge>
											)}
										</div>
									</div>

									<div>
										<Box variant="awsui-key-label">
											Database Engine
										</Box>
										<div>
											{archiveData.Item.database_engine}
										</div>
									</div>

									<div>
										<Box variant="awsui-key-label">
											Database Mode
										</Box>
										<div>
											{' '}
											{job.mode === 'Read' ? (
												<StatusIndicator type="success">
													{job.mode}
												</StatusIndicator>
											) : (
												<StatusIndicator type="warning">
													{job.mode}
												</StatusIndicator>
											)}
										</div>
									</div>
								</ColumnLayout>
							</Container>
						)}
					</SpaceBetween>

					<SpaceBetween size="l">
						<Tabs tabs={tabs} ariaLabel="Resource details" />
					</SpaceBetween>
					<Modal
						onDismiss={() => closeArchiveModel()}
						visible={archiveModal}
						closeAriaLabel="Close modal"
						footer={
							<Box float="right">
								<SpaceBetween direction="horizontal" size="xs">
									<Button
										onClick={closeArchiveModel}
										variant="link"
									>
										Cancel
									</Button>
									<Button
										onClick={archiveRequest}
										variant="primary"
									>
										Archive
									</Button>
								</SpaceBetween>
							</Box>
						}
						header="Archive Database"
					>
						<>
							<SpaceBetween direction="vertical" size="xs">
								<RadioGroup
									onChange={({ detail }) =>
										setArchiveNow(detail.value)
									}
									value={archiveNow}
									items={[
										{
											value: 'now',
											label: 'Run Now',
										},
										// Scheduled for 1.1.0
										// {
										// 	value: "schedule",
										// 	label: "Schedule",
										// },
									]}
								/>
								{archiveNow === 'schedule' ? (
									<FormField
										label="Scheduled Date"
										constraintText="Use YYYY/MM/DD format."
									>
										<DatePicker
											// onChange={({ detail }) => setValue(detail.value)}
											// value={value}
											openCalendarAriaLabel={(
												selectedDate
											) =>
												'Choose certificate expiry date' +
												(selectedDate
													? `, selected date is ${selectedDate}`
													: '')
											}
											nextMonthAriaLabel="Next month"
											placeholder="YYYY/MM/DD"
											previousMonthAriaLabel="Previous month"
											todayAriaLabel="Today"
										/>
									</FormField>
								) : (
									<></>
								)}

								<FormField label="Worker type">
									<Select
										onChange={({ detail }) =>
											setWorkerType(detail.selectedOption)
										}
										selectedOption={workerType}
										options={[
											{ label: 'G.1X', value: 'G.1X' },
											{ label: 'G.2X', value: 'G.2X' },
										]}
									/>
								</FormField>

								<FormField
									label="Worker Maximum Capacity"
									description="The directory in your Amazon S3 bucket or your custom origin."
									errorText={workerCapacityError}
								>
									<Input
										onChange={({ detail }) => {
											if (
												(detail.value >= 2) &
												(detail.value <= 100) &
												!isNaN(detail.value)
											) {
												setWorkerCapacityError('');
												setWorkerCapacity(detail.value);
											} else {
												setWorkerCapacityError(
													'Choose an integer from 2 to 100'
												);
												setWorkerCapacity(detail.value);
											}
										}}
										value={workerCapacity}
										placeholder="Choose an integer from 2 to 100"
										i18nStrings={{
											errorIconAriaLabel: 'Error',
										}}
									/>
								</FormField>
							</SpaceBetween>
						</>
					</Modal>
				</>
			}
			navigation={<SideBarNavigation activeHref="#/distributions" />}
			toolsHide={true}
		/>
	);
}

export default ViewArchive;
