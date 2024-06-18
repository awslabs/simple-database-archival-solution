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

import { useHistory } from 'react-router-dom';
import { SideNavigation, Grid } from '@cloudscape-design/components';

export const navHeader = { text: 'Data Archive', href: '/' };

export const navItems = [
	{
		type: 'link',
		text: 'Home',
		href: '/',
	},

	{
		type: 'link',
		text: 'Add Archive',
		href: '/add-archive',
	},
];

const defaultOnFollowHandler = (ev) => {
	ev.preventDefault();
	LinkTo();
};

function LinkTo(ev) {
	const history = useHistory();
}

export function SideBarNavigation({
	activeHref,
	header = navHeader,
	items = navItems,
	onFollowHandler = defaultOnFollowHandler,
}) {
	return (
		<>
			<SideNavigation
				items={items}
				header={header}
				activeHref={activeHref}
				onFollow={onFollowHandler}
			/>
			<Grid container justify="center"></Grid>
		</>
	);
}
