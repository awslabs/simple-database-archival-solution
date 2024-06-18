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
import {
	AppLayout,
	ContentLayout,
	SpaceBetween,
	Header,
	Flashbar,
} from '@cloudscape-design/components';
import { SideBarNavigation } from '../../components/SideBarNavigation';
import { PageHeader } from '../../components/common-components';
import { FormContent } from './FormContent';

function AddArchive() {
	const [flashbarItems, setFlashbarItems] = useState([]);
	const [enableFlashbar, setEnableFlashbar] = useState(false);

	return (
		<AppLayout
			contentHeader={<PageHeader buttons={[]} />}
			content={
				<ContentLayout
					header={
						<SpaceBetween size="m">
							<Header variant="h1" description="">
								Add Archive
							</Header>
							{enableFlashbar ? (
								<Flashbar items={flashbarItems} />
							) : (
								<></>
							)}
						</SpaceBetween>
					}
				>
					<FormContent
						flashbarItems={flashbarItems}
						setFlashbarItems={setFlashbarItems}
						setEnableFlashbar={setEnableFlashbar}
					/>
				</ContentLayout>
			}
			navigation={<SideBarNavigation activeHref="/add-archive" />}
			toolsHide={true}
			contentType="default"
		/>
	);
}

export default AddArchive;
