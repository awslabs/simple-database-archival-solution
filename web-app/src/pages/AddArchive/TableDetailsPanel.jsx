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

import { useState } from 'react';
import {
    Button,
    Header,
    SpaceBetween,
    Cards,
    Pagination,
    Spinner,
    Table,
    Box,
    ExpandableSection,
    StatusIndicator
} from '@cloudscape-design/components';
import { API } from "aws-amplify";

export default function TableDetailsPanel({
    databaseConnectionState,
    setDatabaseConnectionState,
    databaseConnected,
    setGetTables
}) {

    const [tables, setTables] = useState([]);
    const [selectedItems] = useState([]);
    const [pageCount, setPageCount] = useState(0);
    const [currentPageIndex, setCurrentPageIndex] = useState(1);

    const [gettingSchema, setGettingSchema] = useState(false);
    const [gettingSchemaFailed, setGettingSchemaFailed] = useState(false);


    function sliceIntoChunks(arr, chunkSize) {
        const res = [];
        for (let i = 0; i < arr.length; i += chunkSize) {
            const chunk = arr.slice(i, i + chunkSize);
            res.push(chunk);
        }
        return res;
    }

    const getDatabaseSchema = async (e) => {
        setGettingSchema(true);
        await API.post("api", "api/archive/source/get-schema", databaseConnectionState)
            .then(response => {
                setGettingSchemaFailed(false)
                const tableChunks = sliceIntoChunks(response.tables, 4)
                setTables(tableChunks);
                setPageCount((response.tables.length / 4).toFixed())
                setGettingSchema(false);
                updateNestedProps(response)
                setGetTables(true)
            })
            .catch(error => {
                setGettingSchemaFailed(true)
                setGettingSchema(false);
            })
    };

    const updateNestedProps = (data) => {
        setDatabaseConnectionState(current => {
            const body = { ...current.body };
            body.tables = data.tables;
            return { ...current, body };
        });
    };


    return (

        <Cards
            cardDefinition={{
                header: e => "mssql_schema" in e ? e.mssql_schema + "." + e.table : e.table,
                sections: [
                    {
                        id: "description",
                        header: e => e.oracle_owner ? "Oracle Owner" : "",
                        content: e => e.oracle_owner ? e.oracle_owner : "",
                    },
                    {
                        id: "table",
                        content: e => {
                            return (
                                <ExpandableSection header="Table Schema">
                                    <Table
                                        columnDefinitions={[
                                            {
                                                id: "key",
                                                header: "Field",
                                                cell: e => e.key || "",
                                                sortingField: "name"
                                            },
                                            {
                                                id: "alt",
                                                header: "Data Type",
                                                cell: item => item.value || "",
                                                sortingField: "alt"
                                            },
                                        ]}
                                        items={e.schema}
                                        loadingText="Loading resources"
                                        sortingDisabled
                                        variant="embedded"
                                        empty={
                                            <Box textAlign="center" color="inherit">
                                                <b>No resources</b>
                                                <Box
                                                    padding={{ bottom: "s" }}
                                                    variant="p"
                                                    color="inherit"
                                                >
                                                    No resources to display.
                                                </Box>

                                            </Box>
                                        }
                                    />
                                </ExpandableSection>
                            )
                        }
                    },
                    {
                        content: e => e.type
                    },
                    {
                        content: e => e.size
                    }
                ]
            }}
            cardsPerRow={[
                { cards: 1 },
                { minWidth: 500, cards: 1 }
            ]}
            items={tables[currentPageIndex - 1]}
            loadingText="Loading Schema"
            visibleSections={["description", "table", "size"]}
            header={
                <Header
                    counter={
                        selectedItems.length
                            ? "(" + selectedItems.length + "/" + tables.length + ")"
                            : "(" + tables.length + ")"
                    }
                    actions={
                        <SpaceBetween direction="vertical" size="xs">
                            {gettingSchemaFailed
                                ?
                                <StatusIndicator type="error">
                                    Failed to Fetch Tables
                                </StatusIndicator>
                                :
                                <></>
                            }

                            <SpaceBetween direction="horizontal" size="xs">
                                {gettingSchema ? (
                                    <Button variant="primary">
                                        <Spinner />
                                    </Button>
                                ) : (
                                    <Button
                                        disabled={!databaseConnected}
                                        onClick={getDatabaseSchema}
                                        variant="primary"
                                    >
                                        Fetch Tables
                                    </Button>
                                )}
                            </SpaceBetween>
                        </SpaceBetween>
                    }

                >
                    Table Details
                </Header>
            }
            pagination={
                <Pagination
                    onChange={({ detail }) =>
                        setCurrentPageIndex(detail.currentPageIndex)
                    }
                    currentPageIndex={currentPageIndex}
                    pagesCount={pageCount} />
            }


        />


    );
}