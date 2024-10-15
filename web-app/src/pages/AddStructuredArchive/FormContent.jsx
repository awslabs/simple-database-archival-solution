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

import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
	Button,
	Form,
	SpaceBetween,
	Spinner,
} from '@cloudscape-design/components';
import TableDetailsPanel from './TableDetailsPanel';
import DatabaseTypePanel from './DatabaseTypePanel';
import DatabaseSettingsPanel from './DatabaseSettingsPanel';
import { API } from 'aws-amplify';

function BaseFormContent({
	databaseConnectionState,
	databaseConnected,
	content,
	onCancelClick,
	getTables,
	errorText = null,
}) {
	const history = useHistory();
	const [creatingArchive, setCreatingArchive] = useState(false);

	const createArchive = async (e) => {
		setCreatingArchive(true);
		const response = await API.post(
			'api',
			'api/archive/create',
			databaseConnectionState
		);
		setCreatingArchive(false);
		history.push('/');
	};

	return (
		<form onSubmit={(event) => event.preventDefault()}>
			<Form
				actions={
					<SpaceBetween direction="horizontal" size="xs">
						<Button
							disabled={creatingArchive}
							variant="link"
							onClick={onCancelClick}
						>
							Cancel
						</Button>

						{creatingArchive ? (
							<Button variant="primary">
								<Spinner />
							</Button>
						) : (
							<Button
								disabled={
									!databaseConnected ||
									creatingArchive ||
									!getTables
								}
								onClick={createArchive}
								variant="primary"
							>
								Create archive
							</Button>
						)}
					</SpaceBetween>
				}
				errorText={errorText}
				errorIconAriaLabel="Error"
			>
				{content}
			</Form>
		</form>
	);
}

export function FormContent({ setFlashbarItems, setEnableFlashbar }) {
	const [databaseConnectionState, setDatabaseConnectionState] = useState();
	const [databaseEngine, setDatabaseEngine] = useState();
	const [databaseConnected, setDatabaseConnected] = useState(false);
	const [getTables, setGetTables] = useState(false);

	return (
		<BaseFormContent
			databaseConnectionState={databaseConnectionState}
			setDatabaseConnectionState={setDatabaseConnectionState}
			databaseConnected={databaseConnected}
			setDatabaseConnected={setDatabaseConnected}
			getTables={getTables}
			content={
				<SpaceBetween size="l">
					<DatabaseTypePanel
						setDatabaseEngine={setDatabaseEngine}
						databaseEngine={databaseEngine}
					/>
					<DatabaseSettingsPanel
						setDatabaseEngine={setDatabaseEngine}
						databaseEngine={databaseEngine}
						databaseConnectionState={databaseConnectionState}
						setDatabaseConnectionState={setDatabaseConnectionState}
						databaseConnected={databaseConnected}
						setDatabaseConnected={setDatabaseConnected}
						setFlashbarItems={setFlashbarItems}
						setEnableFlashbar={setEnableFlashbar}
					/>
					<TableDetailsPanel
						databaseConnectionState={databaseConnectionState}
						setDatabaseConnectionState={setDatabaseConnectionState}
						databaseConnected={databaseConnected}
						setDatabaseConnected={setDatabaseConnected}
						setGetTables={setGetTables}
					/>
				</SpaceBetween>
			}
		/>
	);
}
