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
	AppLayout,
	ContentLayout,
	SpaceBetween,
	Header,
	Box,
} from '@cloudscape-design/components';
import { SideBarNavigation } from 'components/SideBarNavigation';
import { FormContent } from './FormContent';

function AddArchive(): JSX.Element {
	return (
		<AppLayout
			content={
				<ContentLayout
					header={
						<Box padding={{ top: 'l' }}>
							<SpaceBetween size="m">
								<Header variant="h1">Add Archive</Header>
							</SpaceBetween>
						</Box>
					}
				>
					<FormContent />
				</ContentLayout>
			}
			navigation={<SideBarNavigation activeHref="/add-archive" />}
			toolsHide={true}
			contentType="default"
		/>
	);
}

export default AddArchive;
