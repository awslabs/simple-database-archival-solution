""" 
Copyright 2023 Amazon.com, Inc. and its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at

  http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License.
"""

from contextlib import nullcontext
import pymssql
import traceback
import os
import logging

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()

if logger.hasHandlers():
    logger.setLevel(LOG_LEVEL)
else:
    logging.basicConfig(level=LOG_LEVEL)


def convert_schema(type):
    if "char" in type:
        return "string"
      
    elif "image" == type:
        return "binary"

    elif "datetime" == type:
        return "timestamp"

    elif "date" == type:
        return "date"

    elif "money" == type:
        return "decimal(19,4)"

    elif "smallmoney" == type:
        return "decimal(10,4)"

    elif "geography" == type:
        return "binary"

    elif "numeric" == type:
        return "decimal(38,6)"

    elif "hierarchyid" == type:
        return "binary"

    elif "int" in type:
        if type == "bigint":
            return "long"
        elif type == "smallint":
            return "smallint"
        else:
            return "int"

    elif "decimal" == type:
        return "decimal"

    elif "bit" == type:
        return "boolean"

    elif "uniqueidentifier" == type:
        return "string"

    elif "xml" == type:
        return "string"

    elif "time" == type:
        return "timestamp"

    elif "varbinary" == type:
        return "binary"

    else:
        return "string"


class Connection:
    def __init__(self, hostname, port, username, password, database):
        self.hostname = hostname
        self.port = port
        self.username = username
        self.password = password
        self.database = database

    def get_schema(self):

        table_list = []

        try:
            connection = pymssql.connect(
                host=self.hostname,
                user=self.username,
                password=self.password,
                database=self.database,
            )

            cursor = connection.cursor()
            cursor.execute("SELECT table_name FROM information_schema.columns")
            tables = cursor.fetchall()

            tables_list = [item for t in tables for item in t]
            deduplicate_tables = [*set(tables_list)]

            for table in deduplicate_tables:
                print(
                    f"SELECT * FROM information_schema.columns WHERE table_name = '{table}'"
                )
                try:
                    table_cursor = connection.cursor()
                    table_cursor.execute(
                        f"SELECT * FROM information_schema.columns WHERE table_name = '{table}'"
                    )
                    row_list = []
                    for row in list(table_cursor.fetchall()):
                        row = list(row)
                        print(row)
                        row_type = convert_schema(row[7])
                        row_list.append(
                            {
                                "key": row[3],
                                "value": row_type,
                                "origin_type": row[7],
                                "existing": True,
                                "schema": row[2],
                            }
                        )
                    table_list.append(
                        {"table": row[2], "schema": row_list,
                            "mssql_schema": row[1]}
                    )
                except Exception as e:
                    print(e)
                    logger.error(traceback.format_exc())
                    raise

            return table_list

        except Exception as e:
            logger.error(traceback.format_exc())
            raise

        finally:
            connection.close()
