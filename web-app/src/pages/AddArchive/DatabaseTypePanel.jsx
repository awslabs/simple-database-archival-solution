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
	Container,
	FormField,
	Header,
	Tiles,
} from '@cloudscape-design/components';

export default function DatabaseTypePanel({
	databaseEngine,
	setDatabaseEngine,
}) {
	return (
		<Container
			className="custom-screenshot-hide"
			header={<Header variant="h2">Database Engine</Header>}
		>
			<FormField stretch={true}>
				<Tiles
					items={[
						{
							value: 'oracle',
							label: 'Oracle',
							description:
								'Oracle® Database is a relational database management system developed by Oracle',
							image: (
								<img
									height="100px"
									src={require('./oracle.png')}
									alt="Oracle®"
									aria-hidden="true"
								/>
							),
						},
						{
							value: 'mysql',
							label: 'MySQL',
							description:
								'MySQL is the most popular open source database in the world',
							image: (
								<img
									height="100px"
									src={require('./mysql.png')}
									alt="MySQL"
									aria-hidden="true"
								/>
							),
						},
						{
							value: 'mssql',
							label: 'Microsoft SQL Server',
							description:
								'Microsoft SQL Server is a relational database management system developed by Microsoft.',
							image: (
								<img
									height="100px"
									src={require('./mssql.png')}
									alt="Microsoft SQL Server"
									aria-hidden="true"
								/>
							),
						},
						{
							value: 'postgresql',
							label: 'PostgreSQL',
							description:
								'PostgreSQL has become the preferred open source relational database for many developers.',
							image: (
								<img
									height="100px"
									src={require('./postgresql.png')}
									alt="Microsoft SQL Server"
									aria-hidden="true"
								/>
							),
						},
					]}
					columns={3}
					value={databaseEngine}
					onChange={(e) => setDatabaseEngine(e.detail.value)}
				/>
			</FormField>
		</Container>
	);
}
