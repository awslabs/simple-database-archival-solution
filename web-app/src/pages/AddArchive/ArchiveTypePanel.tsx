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

import {
	Container,
	FormField,
	Header,
	Tiles,
	TilesProps,
	NonCancelableCustomEvent,
} from '@cloudscape-design/components';
import { ArchiveTypePanelProps } from 'types/index';

export default function ArchiveTypePanel({
	archiveType,
	setArchiveType,
}: ArchiveTypePanelProps): JSX.Element {
	return (
		<Container header={<Header variant="h2">Archive Type</Header>}>
			<FormField stretch={true}>
				<Tiles
					items={[
						{
							value: 'structured',
							label: 'Structured',
							description:
								'Choose Structured to provide connection details for archiving. This option is designed to handle structured data, ensuring seamless integration and management.',
							image: (
								<img
									height="100px"
									src={require('./structured.png')}
									alt="Structured Archive"
									aria-hidden="true"
									style={{ padding: '10px' }}
								/>
							),
						},
						{
							value: 'unstructured',
							label: 'Unstructured',
							description:
								'Select Unstructured to archive data from your AWS S3 Landing Zone bucket. This option allows us to efficiently manage and store your unstructured data.',
							image: (
								<img
									height="100px"
									src={require('./unstructured.png')}
									alt="Unstructured Archive"
									aria-hidden="true"
									style={{ padding: '10px' }}
								/>
							),
						},
					]}
					columns={2}
					value={archiveType}
					onChange={(
						e: NonCancelableCustomEvent<TilesProps.ChangeDetail>
					) => setArchiveType(e.detail.value)}
				/>
			</FormField>
		</Container>
	);
}
