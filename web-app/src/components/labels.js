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

import i18n from '../i18n';

export const paginationLabels = {
	nextPageLabel: i18n.t('pagination.nextPage'),
	previousPageLabel: i18n.t('pagination.previousPage'),
	pageLabel: (pageNumber) => i18n.t('pagination.pageLabel', { pageNumber }),
};

export const originsSelectionLabels = {
	itemSelectionLabel: (data, row) =>
		i18n.t('selection.selectItem', { name: row.name }),
	allItemsSelectionLabel: () => i18n.t('selection.selectAll'),
	selectionGroupLabel: i18n.t('selection.selectionGroup'),
};
