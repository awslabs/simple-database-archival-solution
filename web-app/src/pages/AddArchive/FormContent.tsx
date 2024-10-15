/**
 * Copyright 2024 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *   https://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button, Form, SpaceBetween } from '@cloudscape-design/components';
import ArchiveTypePanel from './ArchiveTypePanel';
import { BaseFormContentProps } from 'types/index';

function BaseFormContent({
	archiveType,
	content,
	onCancelClick,
	errorText = null,
}: BaseFormContentProps): JSX.Element {
	const history = useHistory();

	const pushRoute = async (): Promise<void> => {
		if (!archiveType) return;
		const lowerCaseArchiveType = archiveType.toLowerCase();
		switch (lowerCaseArchiveType) {
			case 'unstructured':
				history.push('/add-unstructured-archive');
				break;
			case 'structured':
				history.push('/add-structured-archive');
				break;
			default:
				break;
		}
	};

	return (
		<form onSubmit={(event) => event.preventDefault()}>
			<Form
				actions={
					<SpaceBetween direction="horizontal" size="xs">
						<Button variant="link" onClick={onCancelClick}>
							Cancel
						</Button>
						<Button
							disabled={!archiveType}
							onClick={pushRoute}
							variant="primary"
						>
							Next
						</Button>
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

export function FormContent(): JSX.Element {
	const [archiveType, setArchiveType] = useState<string | null>(null); // Ensure it aligns with the type
	return (
		<BaseFormContent
			archiveType={archiveType}
			onCancelClick={() => setArchiveType(null)}
			content={
				<SpaceBetween size="l">
					<ArchiveTypePanel
						archiveType={archiveType}
						setArchiveType={setArchiveType}
					/>
				</SpaceBetween>
			}
		/>
	);
}
