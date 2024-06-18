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

export const getHeaderCounterText = (items = [], selectedItems = []) => {
	return selectedItems && selectedItems.length > 0
		? `(${selectedItems.length}/${items.length})`
		: `(${items.length})`;
};

export const getServerHeaderCounterText = (totalCount, selectedItems) => {
	return selectedItems && selectedItems.length > 0
		? `(${selectedItems.length}/${totalCount}+)`
		: `(${totalCount}+)`;
};

export const getServerFilterCounterText = (
	items = [],
	pagesCount,
	pageSize
) => {
	const count =
		pagesCount > 1 ? `${pageSize * (pagesCount - 1)}+` : items.length + '';
	return count === '1' ? `1 match` : `${count} matches`;
};

export const getFilterCounterText = (count) =>
	`${count} ${count === 1 ? 'match' : 'matches'}`;
