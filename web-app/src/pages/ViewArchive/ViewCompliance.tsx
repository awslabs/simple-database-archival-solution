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

import { useState } from 'react';
import {
	SpaceBetween,
	Container,
	Header,
	Toggle,
	FormField,
	DatePicker,
	Spinner,
} from '@cloudscape-design/components';
import { API } from 'aws-amplify';
import { useTranslation } from 'react-i18next';

export function ViewCompliance(
	this: any,
	{
		archiveState,
		setArchiveState,
		archiveData,
		setArchiveData,
	}: {
		archiveState: any;
		setArchiveState: any;
		archiveData: any;
		setArchiveData: any;
	}
) {
	const { t } = useTranslation();
	const [checked, setChecked] = useState(archiveData.Item.legal_hold);
	const [deleteData, setDeleteData] = useState(archiveData.Item.delete_data);
	const [applyingLegalHold, setApplyingLegalHold] = useState(false);
	const [expirationChecked, setExpirationChecked] = useState(
		archiveData.Item.expiration_status
	);

	const [applyingExpiration, setApplyingExpiration] = useState(false);
	const [invalidDate, setInvalidDate] = useState(false);

	const [value, setValue] = useState(archiveData.Item.expiration_date);

	const setLegalHold = async (detail: any) => {
		setApplyingLegalHold(true);
		setChecked(detail.checked);
		const data = {
			body: {
				archive_id: String(archiveData.Item.id),
				legal_hold: detail.checked ? 'ON' : 'OFF',
			},
		};
		const response = await API.post('api', '/api/archive/legal', data);
		getData();
		setApplyingLegalHold(false);
	};

	const setExpiration = async (deleteData: boolean, detail: any) => {
		if (value === '') {
			setInvalidDate(true);
		} else {
			setApplyingExpiration(true);
			setInvalidDate(false);
			setExpirationChecked(detail);

			const data = {
				body: {
					archive_id: String(archiveData.Item.id),
					expiration_status: detail ? 'Enabled' : 'Disabled',
					expiration_date: value,
					delete_data: deleteData,
				},
			};
			const response = await API.post(
				'api',
				'/api/archive/expiration',
				data
			);
			getData();
			setApplyingExpiration(false);
		}
	};

	const getData = async () => {
		const data = {
			body: {
				archive_id: String(archiveData.Item.id),
			},
		};
		const response = await API.post('api', '/api/archive/get', data);
		setArchiveData(response);
		setChecked(response.Item.legal_hold);
		setValue(response.Item.expiration_date);
		setDeleteData(response.Item.delete_data);
		setArchiveState(response.Item.archive_status);
	};

	return (
		<SpaceBetween size="xl">
			<Container
				header={
					<Header
						variant="h2"
						description={t('compliance.legalHoldDescription')}
					>
						{t('compliance.legalHold')}
					</Header>
				}
			>
				{applyingLegalHold ? (
					<Spinner />
				) : (
					<Toggle
						onChange={({ detail }) => setLegalHold(detail)}
						checked={checked}
					>
						{checked
							? t('compliance.disableLegalHold')
							: t('compliance.enableLegalHold')}
					</Toggle>
				)}
			</Container>
			<Container
				header={
					<Header
						variant="h2"
						description={t('compliance.expirationRuleDescription')}
					>
						{t('compliance.expirationRule')}
					</Header>
				}
			>
				<SpaceBetween size="xl">
					{applyingExpiration ? (
						<Spinner />
					) : (
						<Toggle
							onChange={({ detail }) =>
								setExpiration(deleteData, detail.checked)
							}
							checked={expirationChecked}
						>
							{checked
								? t('compliance.disableExpirationRule')
								: t('compliance.enableExpirationRule')}
						</Toggle>
					)}

					{applyingExpiration ? (
						<Spinner />
					) : (
						<Toggle
							disabled={!expirationChecked}
							onChange={({ detail }) =>
								setExpiration(detail.checked, expirationChecked)
							}
							checked={deleteData}
						>
							{deleteData
								? t('compliance.disableDeleteData')
								: t('compliance.deleteData')}
						</Toggle>
					)}

					<FormField
						label={t('compliance.expirationDate')}
						constraintText={t(
							'compliance.expirationDateConstraint'
						)}
					>
						<DatePicker
							onChange={({ detail }) => setValue(detail.value)}
							value={value}
							invalid={invalidDate}
							openCalendarAriaLabel={(selectedDate) =>
								t('compliance.chooseExpirationDate') +
								(selectedDate
									? `, selected date is ${selectedDate}`
									: '')
							}
							nextMonthAriaLabel={t('compliance.nextMonth')}
							placeholder="YYYY/MM/DD"
							previousMonthAriaLabel={t(
								'compliance.previousMonth'
							)}
							todayAriaLabel={t('compliance.today')}
						/>
					</FormField>
				</SpaceBetween>
			</Container>
		</SpaceBetween>
	);
}
