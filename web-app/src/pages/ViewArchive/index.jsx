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
import { ViewViews } from './ViewViews';
import { useTranslation } from 'react-i18next';

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
	const { t } = useTranslation();
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
			label: t('tabs.table'),
			id: 'request',
			content: (
				<ViewTable
					archiveState={archiveState}
					setArchiveState={setArchiveState}
				/>
			),
		},

		{
			label: t('tabs.jobs'),
			id: 'jobs',
			content: (
				<ViewJobs
					archiveState={archiveState}
					setArchiveState={setArchiveState}
				/>
			),
		},

		{
			label: t('tabs.validation'),
			id: 'validation',
			content: (
				<ValidationTable
					archiveState={archiveState}
					setArchiveState={setArchiveState}
				/>
			),
		},

		{
			label: t('tabs.compliance'),
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
			label: t('tabs.dataAccess'),
			id: 'dataaccess',
			content: (
				<ViewData
					archiveState={archiveState}
					setArchiveState={setArchiveState}
				/>
			),
		},
		{
			label: t('tabs.views'),
			id: 'views',
			content: (
				<ViewViews
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
								header={
									<Header variant="h2">
										{t('archive.archive')}
									</Header>
								}
							>
								<Box textAlign="center" color="inherit">
									<Spinner size="large" />
									<Box
										padding={{ bottom: 's' }}
										variant="p"
										color="inherit"
									>
										{t('common.loading')}
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
													{t('archive.archive')}
												</Button>
												<Button
													onClick={refresh}
													iconAlign="right"
													iconName="refresh"
												>
													{t('common.refresh')}
												</Button>
											</SpaceBetween>
										}
										variant="h2"
									>
										{t('archive.archive')}
									</Header>
								}
							>
								<ColumnLayout columns={2} variant="text-grid">
									<div>
										<Box variant="awsui-key-label">
											{t('archive.hostname')}
										</Box>
										<div>{archiveData.Item.hostname}</div>
									</div>
									<div>
										<Box variant="awsui-key-label">
											{t('archive.archiveId')}
										</Box>
										<div>{job.id}</div>
									</div>

									<div>
										<Box variant="awsui-key-label">
											{t('archive.timeSubmitted')}
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
											{t('archive.archiveStatus')}
										</Box>

										<div>
											{' '}
											{archiveState === 'Failed' ? (
												<Badge color="red">
													{t('archive.statusFailed')}
												</Badge>
											) : archiveState === 'Archiving' ? (
												<Badge color="blue">
													{t(
														'archive.statusArchiving'
													)}
												</Badge>
											) : archiveState ===
											  'Validating' ? (
												<Badge color="blue">
													{t(
														'archive.statusValidating'
													)}
												</Badge>
											) : archiveState ===
											  'Archive Queue' ? (
												<Badge>
													{t(
														'archive.statusArchiveQueue'
													)}
												</Badge>
											) : archiveState === 'Archived' ? (
												<Badge color="green">
													{t(
														'archive.statusArchived'
													)}
												</Badge>
											) : (
												<Badge> </Badge>
											)}
										</div>
									</div>

									<div>
										<Box variant="awsui-key-label">
											{t('archive.databaseEngine')}
										</Box>
										<div>
											{archiveData.Item.database_engine}
										</div>
									</div>

									<div>
										<Box variant="awsui-key-label">
											{t('archive.databaseMode')}
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
						closeAriaLabel={t('common.close')}
						footer={
							<Box float="right">
								<SpaceBetween direction="horizontal" size="xs">
									<Button
										onClick={closeArchiveModel}
										variant="link"
									>
										{t('common.cancel')}
									</Button>
									<Button
										onClick={archiveRequest}
										variant="primary"
									>
										{t('archive.archive')}
									</Button>
								</SpaceBetween>
							</Box>
						}
						header={t('archive.archiveDatabase')}
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
											label: t('archive.runNow'),
										},
										// Scheduled for 1.1.0
										// {
										// 	value: "schedule",
										// 	label: t('archive.schedule'),
										// },
									]}
								/>
								{archiveNow === 'schedule' ? (
									<FormField
										label={t('archive.scheduledDate')}
										constraintText={t(
											'archive.scheduledDateConstraint'
										)}
									>
										<DatePicker
											// onChange={({ detail }) => setValue(detail.value)}
											// value={value}
											openCalendarAriaLabel={(
												selectedDate
											) =>
												t(
													'archive.chooseCertificateExpiryDate'
												) +
												(selectedDate
													? `, selected date is ${selectedDate}`
													: '')
											}
											nextMonthAriaLabel={t(
												'archive.nextMonth'
											)}
											placeholder="YYYY/MM/DD"
											previousMonthAriaLabel={t(
												'archive.previousMonth'
											)}
											todayAriaLabel={t('archive.today')}
										/>
									</FormField>
								) : (
									<></>
								)}

								<FormField label={t('archive.workerType')}>
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
									label={t('archive.workerMaximumCapacity')}
									description={t(
										'archive.workerCapacityDescription'
									)}
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
													t(
														'archive.workerCapacityError'
													)
												);
												setWorkerCapacity(detail.value);
											}
										}}
										value={workerCapacity}
										placeholder={t(
											'archive.workerCapacityPlaceholder'
										)}
										i18nStrings={{
											errorIconAriaLabel: t(
												'archive.errorIconAriaLabel'
											),
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
