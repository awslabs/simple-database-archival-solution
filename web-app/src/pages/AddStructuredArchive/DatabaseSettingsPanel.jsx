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
	Container,
	Header,
	Input,
	RadioGroup,
	FormField,
	SpaceBetween,
	Spinner,
	Button,
	StatusIndicator,
} from '@cloudscape-design/components';
import { API } from 'aws-amplify';

const defaultState = {
	sslCertificate: 'default',
	cloudFrontRootObject: '',
	alternativeDomainNames: '',
	s3BucketSelectedOption: null,
	certificateExpiryDate: '',
	certificateExpiryTime: '',
	httpVersion: 'http2',
	ipv6isOn: false,
};

const noop = () => {
	/*noop*/
};

export default function DatabaseSettingsPanel({
	setDatabaseConnectionState,
	databaseEngine,
	databaseConnected,
	setDatabaseConnected,
	updateDirty = noop,
	readOnlyWithErrors = false,
}) {
	const [archivePanelData, setArchivePanelData] = useState(defaultState);

	// Database test connection
	const [databaseTestExecuted, setDatabaseTestExecuted] = useState(false);
	const [databaseConnecting, setDatabaseConnecting] = useState(false);

	useEffect(() => {
		const isDirty =
			JSON.stringify(archivePanelData) !== JSON.stringify(defaultState);
		updateDirty(isDirty);
	}, [archivePanelData, databaseEngine]);

	const onChange = (attribute, value) => {
		if (readOnlyWithErrors) {
			return;
		}

		const newState = { ...archivePanelData };
		newState[attribute] = value;
		setArchivePanelData(newState);
	};

	const getErrorText = (errorMessage) => {
		return readOnlyWithErrors ? errorMessage : undefined;
	};

	const testConnection = async (e) => {
		setDatabaseConnecting(true);

		const myInit = {
			body: {
				database_engine: databaseEngine,
				oracle_owner: archivePanelData.oracleOwner || '',
				hostname: archivePanelData.databaseHostname || '',
				port: archivePanelData.databasePort || '',
				username: archivePanelData.databaseUsername || '',
				password: archivePanelData.databasePassword || '',
				database: archivePanelData.databaseName || '',
				archive_name: archivePanelData.archiveName || '',
				mode: archivePanelData.databaseMode || '',
			},
		};

		setDatabaseConnectionState(myInit);

		try {
			const response = await API.post(
				'api',
				'api/archive/source/test-connection',
				myInit
			);
			setDatabaseConnected(response['connected']);
		} catch (error) {
			setDatabaseConnected(false);
		} finally {
			setDatabaseConnecting(false);
			setDatabaseTestExecuted(true);
		}
	};

	const isEnable =
		archivePanelData.archiveName !== undefined &&
		archivePanelData.databaseName !== undefined &&
		archivePanelData.databaseHostname !== undefined &&
		archivePanelData.databasePort !== undefined &&
		archivePanelData.databasePassword !== undefined &&
		archivePanelData.databaseUsername !== undefined &&
		archivePanelData.databaseMode !== undefined &&
		databaseEngine !== undefined;

	return (
		<Container
			id="distribution-panel"
			header={<Header variant="h2">Database Settings</Header>}
		>
			<SpaceBetween size="l">
				<FormField
					label="Archive Name"
					description="Enter a name for the archive to easily reference."
					errorText={getErrorText('You must specify a root object.')}
					i18nStrings={{ errorIconAriaLabel: 'Error' }}
				>
					<Input
						value={archivePanelData.archiveName}
						ariaRequired={true}
						placeholder=""
						onChange={({ detail: { value } }) =>
							onChange('archiveName', value)
						}
					/>
				</FormField>

				<FormField
					label="Hostname"
					description="Enter the hostname of the database."
					errorText={getErrorText('You must specify a root object.')}
					i18nStrings={{ errorIconAriaLabel: 'Error' }}
				>
					<Input
						value={archivePanelData.databaseHostname}
						ariaRequired={true}
						placeholder=""
						onChange={({ detail: { value } }) =>
							onChange('databaseHostname', value)
						}
					/>
				</FormField>

				<FormField
					label="Database Name"
					description="Enter a the name of the database."
					errorText={getErrorText('You must specify a root object.')}
					i18nStrings={{ errorIconAriaLabel: 'Error' }}
				>
					<Input
						value={archivePanelData.databaseName}
						ariaRequired={true}
						placeholder=""
						onChange={({ detail: { value } }) =>
							onChange('databaseName', value)
						}
					/>
				</FormField>

				<FormField
					stretch={true}
					label={
						<span id="certificate-expiry-label">
							Authentication
						</span>
					}
				>
					<SpaceBetween size="s" direction="horizontal">
						<FormField
							stretch={true}
							description="Enter the username for the connection."
							className="date-time-container"
							errorText={getErrorText('Invalid time format.')}
							i18nStrings={{ errorIconAriaLabel: 'Error' }}
						>
							<Input
								value={archivePanelData.databaseUsername}
								ariaRequired={true}
								placeholder=""
								onChange={({ detail: { value } }) =>
									onChange('databaseUsername', value)
								}
							/>
						</FormField>
						<FormField
							stretch={true}
							description="Enter the password for the connection."
							className="date-time-container"
							errorText={getErrorText('Invalid time format.')}
							i18nStrings={{ errorIconAriaLabel: 'Error' }}
						>
							<Input
								value={archivePanelData.databasePassword}
								ariaRequired={true}
								placeholder=""
								type="password"
								onChange={({ detail: { value } }) =>
									onChange('databasePassword', value)
								}
							/>
						</FormField>
					</SpaceBetween>
				</FormField>

				{databaseEngine === 'oracle' ? (
					<FormField
						stretch={true}
						label={
							<span id="certificate-expiry-label">
								Oracle Owner
							</span>
						}
					>
						<SpaceBetween size="s" direction="horizontal">
							<FormField
								stretch={true}
								description="Enter the username for the Oracle owner."
							>
								<Input
									autoComplete={false}
									value={archivePanelData.oracleOwner}
									ariaRequired={true}
									placeholder=""
									onChange={({ detail: { value } }) =>
										onChange('oracleOwner', value)
									}
								/>
							</FormField>
						</SpaceBetween>
					</FormField>
				) : (
					<></>
				)}

				<FormField
					stretch={true}
					label={
						<span id="certificate-expiry-label">Database Port</span>
					}
				>
					<SpaceBetween size="s" direction="horizontal">
						<FormField
							stretch={true}
							description="Enter the port number of the database."
							className="date-time-container"
							// constraintText={'Use YYYY/MM/DD format.'}
							errorText={getErrorText('Invalid time format.')}
							i18nStrings={{ errorIconAriaLabel: 'Error' }}
						>
							<Input
								autoComplete={false}
								inputMode="numeric"
								type="number"
								value={archivePanelData.databasePort}
								ariaRequired={true}
								placeholder={
									databaseEngine === 'oracle'
										? '1521'
										: databaseEngine === 'mysql'
										? '3306'
										: databaseEngine === 'mssql'
										? '1433'
										: databaseEngine === 'postgresql'
										? '5432'
										: ''
								}
								onChange={({ detail: { value } }) =>
									onChange('databasePort', value)
								}
							/>
						</FormField>
					</SpaceBetween>
				</FormField>

				<FormField
					label="Database Mode"
					description="For the archive process to work, its require to have the database is read only mode"
					stretch={true}
				>
					<RadioGroup
						onChange={({ detail: { value } }) =>
							onChange('databaseMode', value)
						}
						value={archivePanelData.databaseMode}
						ariaRequired={true}
						items={[
							{ value: 'Read', label: 'Read' },
							{
								value: 'Read and Write',
								label: 'Read and Write',
							},
						]}
					/>
				</FormField>

				{databaseTestExecuted ? (
					databaseConnected ? (
						<StatusIndicator type="success">
							Connection Successfully
						</StatusIndicator>
					) : (
						<StatusIndicator type="error">
							Connection Failed
						</StatusIndicator>
					)
				) : (
					<></>
				)}

				{databaseConnecting ? (
					<Button variant="primary">
						<Spinner />
					</Button>
				) : (
					<Button
						disabled={!isEnable}
						onClick={testConnection}
						variant="primary"
					>
						Test Connection
					</Button>
				)}
			</SpaceBetween>
		</Container>
		// </Form>
		// </form>
	);
}
