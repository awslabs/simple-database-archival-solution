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

import psycopg2

class Connection:
    def __init__(self, hostname, port, username, password, database, schema = 'public'):
        self.host = hostname
        self.port = port
        self.user = username
        self.password = password
        self.dbname = database
        self.schema = schema

    def testConnection(self):
        
        try:

            connection = psycopg2.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                dbname=self.dbname,
                options="-c search_path=dbo,{schema}".format(schema=self.schema,),)
            cursor = connection.cursor()
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='{schema}' AND table_type='BASE TABLE'".format(schema=self.schema))
            cursor.fetchall()
            cursor.close()

            return True

        except Exception as e:
            print(e)
            return False
