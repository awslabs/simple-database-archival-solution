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
import { API } from 'aws-amplify';

export function UseAsyncData(loadCallback) {
	const [items, setItems] = useState([]);
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		let rendered = true;
		const getData = async () => {
			const response = await API.get(
				'api',
				'/api/archives/list',
				undefined
			);
			setData(response.data.data.listItems.items);
			setLoading(false);
		};
		getData();
		loadCallback().then((items) => {
			if (rendered) {
				setItems(items);
				setLoading(false);
			}
		});
		return () => {
			rendered = false;
		};
	}, []);

	return [data, loading];
}
