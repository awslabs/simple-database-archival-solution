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
import pymysql
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
        if (type == "varchar"):
            return "varchar"
        else:
            return "string"
    elif "int" in type:
        if ("bigint" in type):
            return "bigint"
        else:
            return "int"
    elif "date" in type:
        return "date"
    elif "enum" in type:
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
            connection = pymysql.connect(
                host=self.hostname,
                user=self.username,
                password=self.password,
                database=self.database,
                charset="utf8mb4",
                cursorclass=pymysql.cursors.DictCursor)

            cursor = connection.cursor()
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()

            for table in tables:
                table_connection = pymysql.connect(
                    host=self.hostname,
                    user=self.username,
                    password=self.password,
                    database=self.database,
                    charset="utf8mb4",
                    cursorclass=pymysql.cursors.DictCursor)
                try:
                    table_cursor = table_connection.cursor()
                    table_cursor.execute(
                        f"DESCRIBE {self.database}.{list(table.values())[0]}")
                    row_list = []
                    for row in table_cursor.fetchall():
                        row_type = convert_schema(row["Type"])
                        row_list.append(
                            {"key": row["Field"], "value": row_type, "existing": True})
                    table_list.append(
                        {"table": list(table.values())[0], "schema": row_list})
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
