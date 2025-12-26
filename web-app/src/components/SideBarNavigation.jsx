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

import { useHistory } from 'react-router-dom';
import { SideNavigation, Grid } from '@cloudscape-design/components';
import { useTranslation } from 'react-i18next';

export function SideBarNavigation({ activeHref }) {
	const history = useHistory();
	const { t } = useTranslation();

	const onFollowHandler = (ev) => {
		ev.preventDefault();
		if (ev.detail.href) {
			history.push(ev.detail.href);
		}
	};

	// Navigation header
	const navHeader = { text: t('navigation.dataArchive'), href: '/' };

	// Navigation items
	const navItems = [
		{
			type: 'link',
			text: t('navigation.home'),
			href: '/',
		},
		{
			type: 'link',
			text: t('navigation.addArchive'),
			href: '/add-archive',
		},
	];

	return (
		<>
			<SideNavigation
				items={navItems}
				header={navHeader}
				activeHref={activeHref}
				onFollow={onFollowHandler}
			/>
			<Grid container justify="center"></Grid>
		</>
	);
}
