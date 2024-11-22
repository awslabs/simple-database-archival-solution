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

import '@aws-amplify/ui-react/styles.css';
import React from 'react';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { applyTheme } from '@cloudscape-design/components/theming';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { TopBarNavigation } from './components/TopBarNavigation';
import Home from './pages/Home';
import AddArchive from './pages/AddArchive';
import ViewArchive from './pages/ViewArchive';

const theme = {
	tokens: {
		borderRadiusContainer: '0.125rem',
		borderRadiusButton: '0.250rem',
		borderRadiusInput: '0.250rem',
	},
	contexts: {
		header: {
			tokens: {
				colorBackgroundContainerHeader: 'transparent',
			},
		},
	},
};

applyTheme({ theme });

function App() {
	return (
		<BrowserRouter>
			<TopBarNavigation />
			<Switch>
				<Route path="/" exact component={Home} />
				<Route path="/add-archive" component={AddArchive} />
				<Route
					path="/view/:id/view/:archive_name/view/:time_submitted/view/:status/view/:mode"
					component={ViewArchive}
				/>
			</Switch>
		</BrowserRouter>
	);
}

const MyTheme = {
	hideSignUp: true,
};

export default withAuthenticator(App, MyTheme);
