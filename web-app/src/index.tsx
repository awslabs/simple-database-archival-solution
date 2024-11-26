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

import './index.css';
import { Amplify, Auth } from 'aws-amplify';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import reportWebVitals from './reportWebVitals';
import '@cloudscape-design/global-styles/index.css';

let basePath: string;
if (process.env.NODE_ENV === 'production') {
	basePath = `${window.location.origin}/`;
} else {
	basePath = process.env.REACT_APP_API_URL || '';
}

fetch(`${basePath}/api/amplify-config`).then(async (response) => {
	const amplifyConfig = await response.json();
	Amplify.configure({
		Auth: {
			mandatorySignIn: true,
			region: amplifyConfig.region,
			userPoolId: amplifyConfig.userPoolId,
			identityPoolId: amplifyConfig.identityPoolId,
			userPoolWebClientId: amplifyConfig.appClientId,
		},
		API: {
			endpoints: [
				{
					name: 'api',
					endpoint: basePath,
					region: amplifyConfig.region,
					custom_header: async () => {
						return {
							Authorization: `Bearer ${(
								await Auth.currentSession()
							)
								.getIdToken()
								.getJwtToken()}`,
						};
					},
				},
			],
		},
	});

	ReactDOM.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
		document.getElementById('root')
	);

	reportWebVitals();
});
