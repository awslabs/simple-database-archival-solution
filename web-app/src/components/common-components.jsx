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

import {
	Button,
	ButtonDropdown,
	Header,
	SpaceBetween,
} from '@cloudscape-design/components';
import {
	getHeaderCounterText,
	getServerHeaderCounterText,
} from './table-counter-strings';

function getCounter(props) {
	if (props.counter) {
		return props.counter;
	}
	if (!props.totalItems) {
		return null;
	}
	if (props.serverSide) {
		return getServerHeaderCounterText(
			props.totalItems,
			props.selectedItems
		);
	}
	return getHeaderCounterText(props.totalItems, props.selectedItems);
}

export const PageHeader = ({ buttons }) => {
	return (
		<Header
			variant="h1"
			actions={
				<SpaceBetween direction="horizontal" size="xs">
					{buttons.map((button, key) =>
						!button.items ? (
							<Button
								href={button.href || ''}
								disabled={button.disabled || false}
								key={key}
							>
								{button.text}
							</Button>
						) : (
							<ButtonDropdown items={button.items} key={key}>
								{button.text}
							</ButtonDropdown>
						)
					)}
				</SpaceBetween>
			}
		></Header>
	);
};

export const TableHeader = (props) => {
	return (
		<Header
			variant={props.variant}
			counter={getCounter(props)}
			description={props.description}
			actions={props.actionButtons}
		>
			{props.title}
		</Header>
	);
};
