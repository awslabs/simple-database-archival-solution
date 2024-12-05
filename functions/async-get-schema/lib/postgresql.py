""" 
Copyright 2024 Amazon.com, Inc. and its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at

  https://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License.
"""

import psycopg2
import traceback
import os
import logging

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()

if logger.hasHandlers():
    logger.setLevel(LOG_LEVEL)
else:
    logging.basicConfig(level=LOG_LEVEL)


def convert_schema(data_type, udt_name=None):
    # Check if the type is an array
    if data_type == "ARRAY":
        base_type = convert_schema(udt_name)
        return f"array<{base_type}>"

    type_mapping = {
        "bigint": "bigint",
        "bigserial": "int",
        "bit": "string",
        "boolean": "boolean",
        "box": "string",
        "bytea": "binary",
        "character": "string",
        "cidr": "string",
        "circle": "string",
        "date": "date",
        "double precision": "decimal(38,6)",
        "inet": "string",
        "integer": "int",
        "interval": "string",
        "json": "string",
        "jsonb": "string",
        "lseg": "string",
        "macaddr": "string",
        "macaddr8": "string",
        "money": "decimal(19,4)",
        "numeric": "decimal(38,18)",
        "path": "string",
        "pg_lsn": "string",
        "pg_snapshot": "string",
        "point": "string",
        "polygon": "string",
        "real": "decimal(19,4)",
        "smallint": "smallint",
        "smallserial": "int",
        "serial": "int",
        "text": "string",
        "timestamp": "timestamp",
        "timestamp without time zone": "timestamp",
        "time": "string",
        "tsquery": "string",
        "tsvector": "string",
        "txid_snapshot": "string",
        "uuid": "string",
        "xml": "string",
        "ARRAY": "array<string>",
        "USER-DEFINED": "string"
    }

    return type_mapping.get(data_type, "string")


class Connection:

    def __init__(self, hostname, port, username, password, database):
        self.host = hostname
        self.port = port
        self.user = username
        self.password = password
        self.dbname = database

    def get_schema(self):

        table_list = []

        try:
            connection = psycopg2.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                dbname=self.dbname)

            cursor = connection.cursor()
            cursor.execute(
                """
                SELECT
                    table_schema || '.' || table_name
                FROM
                    information_schema.tables
                WHERE
                    table_type = 'BASE TABLE'
                AND
                    table_schema NOT IN ('pg_catalog', 'information_schema');
                """
            )
            tables = cursor.fetchall()
            for table in tables:
                table_connection = psycopg2.connect(
                    host=self.host,
                    port=self.port,
                    user=self.user,
                    password=self.password,
                    dbname=self.dbname)
                try:
                    sql_string = """
                        SELECT 
                            column_name, 
                            data_type, 
                            udt_name,  -- Base type for arrays
                            is_nullable
                        FROM 
                            information_schema.columns
                        WHERE 
                            table_name = '{0}';
                    """

                    table_cursor = table_connection.cursor()
                    execute_sql_string = sql_string.format(
                        table[0].split('.', 1)[1])
                    table_cursor.execute(execute_sql_string)

                    rows = table_cursor.fetchall()
                    if len(rows) != 0:
                        row_list = []
                        for row in rows:
                            row_type = convert_schema(row[1], row[2])
                            row_list.append(
                                {
                                    "key": row[0],
                                    "value": row_type,
                                    "origin_type": row[1],
                                    "existing": True,
                                    "is_nullable": row[3]
                                }
                            )
                        if len(rows) != 0:
                            table_list.append(
                                {"table": table[0], "schema": row_list})
                except Exception as e:
                    logger.error(traceback.format_exc())
                    raise
                finally:
                    table_connection.close()

            return table_list

        except Exception as e:
            logger.error(traceback.format_exc())
            raise
        finally:
            cursor.close()
            connection.close()
