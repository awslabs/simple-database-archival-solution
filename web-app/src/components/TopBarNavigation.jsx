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
import TopNavigation from '@cloudscape-design/components/top-navigation';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import { Auth } from 'aws-amplify';

const i18nStrings = {};

export function TopBarNavigation() {
	const [darkMode, setDarkMode] = useState(false);
	const [user, setUser] = useState('');

	const setDarkLightTheme = () => {
		if (darkMode) {
			localStorage.setItem('darkMode', false);
			applyMode(Mode.Light);
			setDarkMode(false);
		} else {
			localStorage.setItem('darkMode', true);
			applyMode(Mode.Dark);
			setDarkMode(true);
		}
	};

	async function signOut() {
		try {
			await Auth.signOut();
		} catch (error) {
			console.log('error signing out: ', error);
		}
	}

	async function onItemClickEvent(event) {
		if (event.detail.id === 'signout') {
			try {
				await Auth.signOut();
			} catch (error) {
				console.log('error signing out: ', error);
			}
		}
	}

	async function getUser() {
		try {
			let currentUser = await Auth.currentUserInfo();
			setUser(currentUser['attributes']['email']);
		} catch (error) {
			console.log('error getting current user: ', error);
		}
	}

	useEffect(() => {
		setDarkMode(document.body.className === 'awsui-dark-mode');
		const darkModePreference = localStorage.getItem('darkMode');
		if (darkModePreference === 'true') {
			applyMode(Mode.Dark);
			setDarkMode(true);
		} else {
			applyMode(Mode.Light);
			setDarkMode(false);
		}

		getUser();
	}, []);

	return (
		<TopNavigation
			i18nStrings={i18nStrings}
			identity={{
				href: '/',
				title: 'Simple Database Archival Solution',
				logo: {
					src: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMSIgaGVpZ2h0PSIzMSIgdmlld0JveD0iMCAwIDMxIDMxIj48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6IzhiY2E4Mjt9LmNscy0ye2ZpbGw6I2YyOWUzNzt9LmNscy0ze2ZpbGw6I2NlM2Y2MDt9LmNscy00e2ZpbGw6I2JjZTNkZTt9LmNscy01e2ZpbGw6I2UwNzliMDt9LmNscy02e2ZpbGw6I2YzYjA5Yjt9LmNscy03e2ZpbGw6IzZiNjRhZDt9PC9zdHlsZT48L2RlZnM+PHJlY3QgaWQ9IlJlY3RhbmdsZSIgY2xhc3M9ImNscy01IiB4PSIyMy4wNCIgd2lkdGg9IjcuOTYiIGhlaWdodD0iOC40NSIvPjxyZWN0IGlkPSJSZWN0YW5nbGUtQ29weSIgY2xhc3M9ImNscy0xIiB4PSIyMy4wNCIgeT0iMTEuMjgiIHdpZHRoPSI3Ljk2IiBoZWlnaHQ9IjguNDUiLz48cmVjdCBpZD0iUmVjdGFuZ2xlLUNvcHktMiIgY2xhc3M9ImNscy0yIiB4PSIyMy4wNCIgeT0iMjIuNTUiIHdpZHRoPSI3Ljk2IiBoZWlnaHQ9IjguNDUiLz48cmVjdCBpZD0iUmVjdGFuZ2xlLTIiIGNsYXNzPSJjbHMtNCIgeD0iMTEuNTEiIHdpZHRoPSI3Ljk2IiBoZWlnaHQ9IjguNDUiLz48cmVjdCBpZD0iUmVjdGFuZ2xlLUNvcHktMiIgY2xhc3M9ImNscy0zIiB4PSIxMS41MSIgeT0iMTEuMjgiIHdpZHRoPSI3Ljk2IiBoZWlnaHQ9IjguNDUiLz48cmVjdCBpZD0iUmVjdGFuZ2xlLUNvcHktMi0yIiBjbGFzcz0iY2xzLTYiIHg9IjExLjUxIiB5PSIyMi41NSIgd2lkdGg9IjcuOTYiIGhlaWdodD0iOC40NSIvPjxyZWN0IGlkPSJSZWN0YW5nbGUtMyIgY2xhc3M9ImNscy0xIiB3aWR0aD0iNy45NiIgaGVpZ2h0PSI4LjQ1Ii8+PHJlY3QgaWQ9IlJlY3RhbmdsZS1Db3B5LTMiIGNsYXNzPSJjbHMtNyIgeT0iMTEuMjgiIHdpZHRoPSI3Ljk2IiBoZWlnaHQ9IjguNDUiLz48cmVjdCBpZD0iUmVjdGFuZ2xlLUNvcHktMi0zIiBjbGFzcz0iY2xzLTMiIHk9IjIyLjU1IiB3aWR0aD0iNy45NiIgaGVpZ2h0PSI4LjQ1Ii8+PC9zdmc+',
					alt: 'Simple Database Archival Solution',
				},
			}}
			utilities={[
				{
					type: 'button',
					variant: 'primary',
					href: '/add-archive',
					iconName: 'add-plus',
					text: '   Add Archive',
					title: '   Add Archive',
				},
				{
					type: 'button',
					variant: 'primary',
					onClick: () => setDarkLightTheme(),
					iconSvg: Mode.Dark ? (
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M12.8166 9.79921C12.8417 9.75608 12.7942 9.70771 12.7497 9.73041C11.9008 10.164 10.9392 10.4085 9.92054 10.4085C6.48046 10.4085 3.69172 7.61979 3.69172 4.17971C3.69172 3.16099 3.93628 2.19938 4.36989 1.3504C4.39259 1.30596 4.34423 1.25842 4.3011 1.28351C2.44675 2.36242 1.2002 4.37123 1.2002 6.67119C1.2002 10.1113 3.98893 12.9 7.42901 12.9C9.72893 12.9 11.7377 11.6535 12.8166 9.79921Z"
								fill="white"
								stroke="white"
								strokeWidth="2"
								className="filled"
							/>
						</svg>
					) : (
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M12.8166 9.79921C12.8417 9.75608 12.7942 9.70771 12.7497 9.73041C11.9008 10.164 10.9392 10.4085 9.92054 10.4085C6.48046 10.4085 3.69172 7.61979 3.69172 4.17971C3.69172 3.16099 3.93628 2.19938 4.36989 1.3504C4.39259 1.30596 4.34423 1.25842 4.3011 1.28351C2.44675 2.36242 1.2002 4.37123 1.2002 6.67119C1.2002 10.1113 3.98893 12.9 7.42901 12.9C9.72893 12.9 11.7377 11.6535 12.8166 9.79921Z"
								fill="white"
								stroke="white"
								strokeWidth="2"
								className="filled"
							/>
						</svg>
					),
					text: darkMode ? '   Light Mode' : '   Dark Mode',
					title: darkMode ? '   Light Mode' : '   Dark Mode',
				},
				{
					type: 'menu-dropdown',
					text: user,
					description: user,
					iconName: 'user-profile',
					onItemClick: (e) => onItemClickEvent(e),
					items: [
						{
							id: 'support-group',
							text: 'Support',
							items: [
								{
									id: 'documentation',
									text: 'Documentation',
									href: 'https://github.com/awslabs/simple-database-archival-solution/blob/main/README.md',
									external: true,
									externalIconAriaLabel:
										' (opens in new tab)',
								},
								{
									id: 'support',
									text: 'Support',
									href: 'https://github.com/awslabs/simple-database-archival-solution/issues',
									external: true,
									externalIconAriaLabel:
										' (opens in new tab)',
								},
							],
						},
						{
							id: 'signout',
							type: 'button',
							variant: 'primary',
							iconName: 'unlocked',
							text: '   Sign Out',
							title: '   Sign Out',
						},
					],
				},
			]}
		/>
	);
}
