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

import pymssql


class Connection:
    def __init__(self, hostname, port, username, password, database):
        self.hostname = hostname
        self.port = port
        self.username = username
        self.password = password
        self.database = database

    def testConnection(self):
        print("testConnection")
        try:

            connection = pymssql.connect(
                host=self.hostname,
                user=self.username,
                password=self.password,
                database=self.database)
            print(connection)
            cursor = connection.cursor()
            cursor.execute("select * from sys.databases")
            cursor.fetchall()
            cursor.close()

            return True

        except Exception as e:
            print(e)
            return False
