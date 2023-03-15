# Simple Database Archiving System

Simple Database Archiving System (SDAS) is an open source solution, which you can deploy in your AWS account to archive data to AWS. SDAS will connect to your database which can be on premises or in the cloud, map the schema, perform validation, and finally transfer data to AWS for storage in Amazon S3. This is accomplished by primarily leveraging AWS Step Functions and AWS Glue. The main purpose of SDAS is to provide an out-of-the-box solution that easily allows customers to archive data in the cloud coming from on premises or cloud-hosted databases.

## What is Simple Database Archival Solution (SDAS)?

As businesses accumulate more and more data over time, the need for effective database archiving solutions has become increasingly important, for example moving older, rarely used data to an archive. Businesses can reduce the size of their active databases, which can improve performance and reduce storage costs. Archiving also helps organizations meet legal and regulatory requirements for data retention, as well as ensure that important data is available for future use and discovery, if necessary. Out of the box, SDAS provides the following key features:

- Support for Oracle, MySQL or Microsoft SQL Server
- Identify the data type and table schema
- Validate the data on the target after the archiving process has completed
- Ability to configure WORM (“Write Once Read Many”)
- Ability to defined data retention period for the data
- Detailed information about the status of the data
- Perform various data validation and integrity checks
- Make it simple for operation to ingest and archive database
- Ability to preview data archived in Amazon S3

## Architecture

TO ADD

## Tool Versions

To build and deploy SDAS the following tools are required.

1. NodeJs >= 16
2. Python3 >= 3.9
3. Docker

## Deploy

### 1. Installing the SDAS Package Dependencies

Execute the following commands to install the package dependencies.

- `npm install` is used for React (and many other web development frameworks) to install the required packages and dependencies required for a project.

- In AWS CDK (Cloud Development Kit), the "deploy" folder is the default directory where assets are located for deploying the AWS infrastructure will be placed.

```bash
# From the deploy directory
npm install
```

```bash
# From the web-app directory
npm install
```

### 2. Build Web-app

```bash
# From the web-app directory
npm run build
```

### 3. Bootstrap

If you are deploying to a new account or region you will need to bootstrap the CDK. By default CDK bootstraps with AdministratorAccess policy which is restricted in certain environments. If you need greater access than PowerUserAccess and IAMFullAccess, add the role arns to the list.

If you are installing the application into a region other than `us-east-1` you must bootstrap both regions. You can do this by setting the environment variable `CDK_DEPLOY_REGION` to us-east-1 and running the command below, then clearing the environment variable to pick up the set default. Or you can manually run the command with both regions provided. See statements below.

```bash
# From the deploy directory
cdk bootstrap
```

or manually

```bash
cdk bootstrap --cloudformation-execution-policies "arn:aws:iam::aws:policy/PowerUserAccess,arn:aws:iam::aws:policy/IAMFullAccess"

# or

cdk bootstrap ${AWS_ACCOUNT}/us-east-1 ${AWS_ACCOUNT}/us-west-1 --cloudformation-execution-policies "arn:aws:iam::aws:policy/PowerUserAccess,arn:aws:iam::aws:policy/IAMFullAccess"
```

### 4. Deploy

```bash
# From the web-app directory
npm run build
```

To deploy an environment by branch name, run:

```bash
# From the deploy directory
# Replace ${BRANCH_NAME} with your branch name, for example:
# cdk bootstrap main
cdk deploy ${BRANCH_NAME}
```

## Destroy

To destroy the dev environment, run:

```bash
# From the deploy directory
# Replace ${BRANCH_NAME} with your branch name, for example:
# cdk destroy main
cdk destroy ${BRANCH_NAME}
```

## Development

The top level project structure follows a responsibility structure:

- `/api` - contains lambda functions for the api
- `/deploy` - contains cloud development kit (CDK) to deploy the solution
- `/web-app` - contains the SPA web client for the application
- `/functions` - contains the lambda functions not associated with APIs
- `/step-functions` - contains the lambda functions for AWS Step Functions

## Access the Front-end

## Archive Database

## Troubleshooting

### Docker issues

### Build fails during a docker step due to `OSError: [Errno 28] No space left on device:` or something similar.

Open docker desktop, click on `Images`, click on `Clean up`, check `Unused` and `Dangling`, then click `Remove`.

or run from the command line: `docker image prune -a`

# Contributing

See the [CONTRIBUTING](CONTRIBUTING.md) file for how to contribute.

# License

See the [LICENSE](LICENSE) file for our project's licensing.

Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
