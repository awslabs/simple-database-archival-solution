/* eslint-disable prettier/prettier */
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

import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as lambdaPython from "@aws-cdk/aws-lambda-python-alpha";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as athena from "aws-cdk-lib/aws-athena";

import { AmplifyConfigLambdaConstruct } from "./constructs/amplify-config-lambda-construct";
import { ApiGatewayV2CloudFrontConstruct } from "./constructs/apigatewayv2-cloudfront-construct";
import { ApiGatewayV2LambdaConstruct } from "./constructs/apigatewayv2-lambda-construct";
import { CloudFrontS3WebSiteConstruct } from "./constructs/cloudfront-s3-website-construct";
import { CognitoWebNativeConstruct } from "./constructs/cognito-web-native-construct";
import { SsmParameterReaderConstruct } from "./constructs/ssm-parameter-reader-construct";
import { S3BucketConstruct } from "./constructs/s3-bucket-construct";
import { DasApiPythonConstruct } from "./constructs/das-api-python-construct";

export interface AppStackProps extends cdk.StackProps {
    readonly ssmWafArnParameterName: string;
    readonly ssmWafArnParameterRegion: string;
}

/**
 * AppStack for an S3 website and api gatewayv2 proxied through a CloudFront distribution
 *
 */

export class AppStack extends cdk.Stack {
    public readonly testConnectionLambda: lambdaPython.PythonFunction;
    public readonly databaseSchemaLambda: lambdaPython.PythonFunction;

    constructor(scope: Construct, id: string, props: AppStackProps) {
        super(scope, id, props);

        const webAppBuildPath = "../web-app/build";
        const awsAccountId = cdk.Stack.of(this).account;
        const awsRegion = cdk.Stack.of(this).region;
        const cognito = new CognitoWebNativeConstruct(this, "Cognito", props);

        /*
         * START
         * Cognito Groups and Admin User
         */

        const adminGroup = new cdk.aws_cognito.CfnUserPoolGroup(
            this,
            "SdasAdminsGroup",
            {
                groupName: "sdas-admins",
                userPoolId: cognito.userPoolId,
                description: "SDAS Administrators",
            }
        );

        // Admin User
        const adminUser = new cdk.aws_cognito.CfnUserPoolUser(
            this,
            "SdasAdminUser",
            {
                userPoolId: cognito.userPoolId,
                username: "admin",
                userAttributes: [
                    {
                        name: "email",
                        value: this.node.tryGetContext("admin_email"),
                    },
                    {
                        name: "given_name",
                        value: "SDAS",
                    },
                    {
                        name: "family_name",
                        value: "Admin",
                    },
                    {
                        name: "email_verified",
                        value: "true",
                    },
                    {
                        name: "preferred_username",
                        value: "sdasAdmin",
                    },
                ],
                desiredDeliveryMediums: ["EMAIL"],
            }
        );

        const adminGroupAttachment =
            new cdk.aws_cognito.CfnUserPoolUserToGroupAttachment(
                this,
                "AdminGroupAttachment",
                {
                    username: adminUser.username!,
                    groupName: adminGroup.groupName!,
                    userPoolId: cognito.userPoolId,
                }
            );

        adminGroupAttachment.node.addDependency(adminGroup, adminUser);

        /*
         * END
         * Cognito Groups and Admin User
         */

        /*
         * START
         * CREATE SDAS VPC
         */

        const cwLogs = new logs.LogGroup(this, "VpcFlowLogs", {
            logGroupName: "/aws/vpc/flowlogs",
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const availabilityZones = cdk.Stack.of(this).availabilityZones;

        const vpc = new ec2.Vpc(this, `${props.stackName}-vpc`, {
            cidr: "10.0.0.0/16",
            natGateways: 1,
            maxAzs: availabilityZones.length,
            flowLogs: {
                s3: {
                    destination: ec2.FlowLogDestination.toCloudWatchLogs(cwLogs),
                    trafficType: ec2.FlowLogTrafficType.ALL,
                },
            },
            subnetConfiguration: [
                {
                    name: "private-subnet-",
                    subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
                    cidrMask: 24,
                },
                {
                    name: "public-subnet-",
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
            ],
        });

        new cdk.CfnOutput(this, "VpcId", {
            value: vpc.vpcId,
            exportName: "MyVpcId",
        });

        const vpce = new ec2.GatewayVpcEndpoint(this, "S3Vpce", {
            service: ec2.GatewayVpcEndpointAwsService.S3,
            vpc,
        });

        const subnets = vpc.privateSubnets;
        const securityGroup = vpc.vpcDefaultSecurityGroup;

        /*
         * END
         * CREATE SDAS VPC
         */

        const cfWafWebAcl = new SsmParameterReaderConstruct(
            this,
            "SsmWafParameter",
            {
                ssmParameterName: props.ssmWafArnParameterName,
                ssmParameterRegion: props.ssmWafArnParameterRegion,
            }
        ).getValue();

        const website = new CloudFrontS3WebSiteConstruct(this, "WebApp", {
            webSiteBuildPath: webAppBuildPath,
            webAclArn: cfWafWebAcl,
        });

        const api = new ApiGatewayV2CloudFrontConstruct(this, "Api", {
            cloudFrontDistribution: website.cloudFrontDistribution,
            userPool: cognito.userPool,
            userPoolClient: cognito.webClientUserPool,
        });

        new AmplifyConfigLambdaConstruct(this, "AmplifyConfigFn", {
            api: api.apiGatewayV2,
            appClientId: cognito.webClientId,
            identityPoolId: cognito.identityPoolId,
            userPoolId: cognito.userPoolId,
        });

        /*
         * START
         * CREATE DynamoDB Tables
         */

        const archiveTable = new dynamodb.Table(this, "archives", {
            partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY,
            pointInTimeRecovery: true,
        });

        const queryIdLookupTable = new dynamodb.Table(this, "query_lookup", {
            partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY,
            pointInTimeRecovery: true,
        });

        /*
         * END
         * CREATE DynamoDB Tables
         */

        /*
         * START
         * CREATE S3 Buckets
         */

        const s3GlueAssetBucket = new S3BucketConstruct(this, "Glue-Asset", {
            cfnOutputName: "Glue-Asset",
            addEventNotification: true,
            enforceSSL: true,
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
            encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
            serverAccessLogsPrefix: "/access-logs/",
            versioned: true,
            deleteObjects: true,
            objectLockEnabled: false,
        });

        new ssm.StringParameter(this, "CreateS3GlueAssetBucketParam", {
            parameterName: "/glue/s3-bucket-glue-assets",
            stringValue: s3GlueAssetBucket.bucketName,
            description: "AWS Glue Asset bucket",
            type: ssm.ParameterType.STRING,
            tier: ssm.ParameterTier.STANDARD,
            allowedPattern: ".*",
        });

        const s3AwsGlueTempBucket = new S3BucketConstruct(this, "Glue-Temp", {
            cfnOutputName: "Glue-Temp",
            addEventNotification: true,
            enforceSSL: true,
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
            encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
            serverAccessLogsPrefix: "/access-logs/",
            versioned: true,
            deleteObjects: false,
            objectLockEnabled: false,
        });

        new ssm.StringParameter(this, "S3AwsGlueTempBucketParameter", {
            parameterName: "/glue/temp-dir",
            stringValue: s3AwsGlueTempBucket.bucketName,
            description: "AWS Glue Temp bucket",
            type: ssm.ParameterType.STRING,
            tier: ssm.ParameterTier.STANDARD,
            allowedPattern: ".*",
        });

        const s3ArchiveDataGlueBucket = new S3BucketConstruct(
            this,
            "Archive-Data",
            {
                cfnOutputName: "Archive-Data",
                addEventNotification: true,
                enforceSSL: true,
                removalPolicy: RemovalPolicy.DESTROY,
                blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
                encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
                serverAccessLogsPrefix: "/access-logs/",
                versioned: true,
                deleteObjects: false,
                objectLockEnabled: true,
            }
        );

        new ssm.StringParameter(this, "CreateS3TableDataGlueParam", {
            parameterName: "/job/s3-bucket-table-data",
            stringValue: s3ArchiveDataGlueBucket.bucketName,
            description: "AWS Glue Table data bucket",
            type: ssm.ParameterType.STRING,
            tier: ssm.ParameterTier.STANDARD,
            allowedPattern: ".*",
        });

        const s3AthenaTempBucket = new S3BucketConstruct(this, "Athena-Temp", {
            cfnOutputName: "Athena-Temp",
            addEventNotification: true,
            enforceSSL: true,
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
            encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
            serverAccessLogsPrefix: "access-logs",
            versioned: true,
            deleteObjects: false,
            objectLockEnabled: false,
        });

        new ssm.StringParameter(this, "S3AthenaTempBucketParameter", {
            parameterName: "/athena/s3-athena-temp-bucket",
            stringValue: s3AthenaTempBucket.bucketName,
            description: "AWS Glue Table data bucket",
            type: ssm.ParameterType.STRING,
            tier: ssm.ParameterTier.STANDARD,
            allowedPattern: ".*",
        });

        /*
         * END
         * CREATE S3 Buckets
         */

        /*
         * START
         * AWS Athena Query Results bucket
         * Encrypt with SSE_S3 results
         */

        const sdasWorkGroup = new athena.CfnWorkGroup(this, "SdasWorkGroup", {
            name: "sdas",
            description: "Query results from SDAS Front-end",
            recursiveDeleteOption: true,
            state: "ENABLED",
            workGroupConfiguration: {
                enforceWorkGroupConfiguration: true,
                resultConfiguration: {
                    encryptionConfiguration: {
                        encryptionOption: "SSE_S3",
                    },
                    outputLocation: `s3://${s3AthenaTempBucket.bucketName}`,
                },
            },
        });

        /*
         * START
         * AWS Athena Query Results bucket
         * Encrypt with SSE_S3 results
         */

        /*
         * START
         * AWS Glue IAM Role
         */

        const awsGlueRole = new iam.Role(this, "AwsGlueRole", {
            assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
            description: "IAM role for AWS Glue",
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    "service-role/AWSGlueServiceRole"
                ),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
            ],
        });

        new ssm.StringParameter(this, "AwsGlueRoleParameter", {
            parameterName: "/glue/glue-role",
            stringValue: awsGlueRole.roleName,
            description: "AWS Glue Role Name",
            type: ssm.ParameterType.STRING,
            tier: ssm.ParameterTier.STANDARD,
            allowedPattern: ".*",
        });

        /*
         * END
         * AWS Glue IAM Role
         */

        /*
         * START
         * AWS IAM Policy Statements
         */

        const dynamoDbReadOnlyPolicy = new iam.PolicyStatement({
            actions: [
                "dynamodb:BatchGetItem",
                "dynamodb:DescribeImport",
                "dynamodb:ConditionCheckItem",
                "dynamodb:DescribeContributorInsights",
                "dynamodb:Scan",
                "dynamodb:ListTagsOfResource",
                "dynamodb:Query",
                "dynamodb:DescribeStream",
                "dynamodb:DescribeTimeToLive",
                "dynamodb:DescribeGlobalTableSettings",
                "dynamodb:PartiQLSelect",
                "dynamodb:DescribeTable",
                "dynamodb:GetShardIterator",
                "dynamodb:DescribeGlobalTable",
                "dynamodb:GetItem",
                "dynamodb:DescribeContinuousBackups",
                "dynamodb:DescribeExport",
                "dynamodb:DescribeKinesisStreamingDestination",
                "dynamodb:DescribeBackup",
                "dynamodb:GetRecords",
                "dynamodb:DescribeTableReplicaAutoScaling",
            ],
            resources: [
                `arn:aws:dynamodb:*:${awsAccountId}:table/${archiveTable.tableName}`,
                `arn:aws:dynamodb:*:${awsAccountId}:table/${queryIdLookupTable.tableName}`,
            ],
        });

        const dynamoDbWritePolicy = new iam.PolicyStatement({
            actions: [
                "dynamodb:DeleteItem",
                "dynamodb:RestoreTableToPointInTime",
                "dynamodb:CreateTableReplica",
                "dynamodb:UpdateContributorInsights",
                "dynamodb:UpdateGlobalTable",
                "dynamodb:CreateBackup",
                "dynamodb:DeleteTable",
                "dynamodb:UpdateTableReplicaAutoScaling",
                "dynamodb:UpdateContinuousBackups",
                "dynamodb:PartiQLInsert",
                "dynamodb:CreateGlobalTable",
                "dynamodb:EnableKinesisStreamingDestination",
                "dynamodb:ImportTable",
                "dynamodb:DisableKinesisStreamingDestination",
                "dynamodb:UpdateTimeToLive",
                "dynamodb:BatchWriteItem",
                "dynamodb:PutItem",
                "dynamodb:PartiQLUpdate",
                "dynamodb:StartAwsBackupJob",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteTableReplica",
                "dynamodb:CreateTable",
                "dynamodb:UpdateGlobalTableSettings",
                "dynamodb:RestoreTableFromAwsBackup",
                "dynamodb:RestoreTableFromBackup",
                "dynamodb:ExportTableToPointInTime",
                "dynamodb:DeleteBackup",
                "dynamodb:UpdateTable",
                "dynamodb:PartiQLDelete",
            ],
            resources: [
                `arn:aws:dynamodb:*:${awsAccountId}:table/${archiveTable.tableName}`,
                `arn:aws:dynamodb:*:${awsAccountId}:table/${queryIdLookupTable.tableName}`,
            ],
        });

        const ssmGetParameterPolicy = new iam.PolicyStatement({
            actions: ["ssm:GetParameter"],
            resources: [
                `arn:aws:ssm:us-east-1:${awsAccountId}:parameter/archive/dynamodb-table`,
                `arn:aws:ssm:us-east-1:${awsAccountId}:parameter/archive/websocket-connection-dynamodb-table`,
                `arn:aws:ssm:us-east-1:${awsAccountId}:parameter/job/s3-bucket-table-data`,
                `arn:aws:ssm:us-east-1:${awsAccountId}:parameter/athena/s3-athena-temp-bucket`,
                `arn:aws:ssm:us-east-1:${awsAccountId}:parameter/job/step-functions-state-machine`,
                `arn:aws:ssm:us-east-1:${awsAccountId}:parameter/glue/s3-bucket-glue-assets`,
                `arn:aws:ssm:us-east-1:${awsAccountId}:parameter/job/sf-validation-state-machine`,
                `arn:aws:ssm:us-east-1:${awsAccountId}:parameter/glue/temp-dir`,
                `arn:aws:ssm:us-east-1:${awsAccountId}:parameter/archive/query-lookup-dynamodb-table`,
                `arn:aws:ssm:us-east-1:${awsAccountId}:parameter/glue/glue-role`,
                `arn:aws:ssm:us-east-1:${awsAccountId}:parameter/sqs/validation`,
            ],
        });

        const athenaPolicy = new iam.PolicyStatement({
            actions: [
                "athena:GetWorkGroup",
                "athena:GetQueryExecution",
                "athena:GetQueryResults",
                "athena:GetQueryExecution",
                "s3:PutObject",
                "s3:GetObject",
                "athena:StartQueryExecution",
                "athena:GetQueryResults",
                "glue:GetTable",
            ],
            resources: [
                `arn:aws:athena:${this.region}:${awsAccountId}:*`,
                `${s3AthenaTempBucket.bucket.bucketArn}/*`,
            ],
        });

        const s3GetObjectAthenaQueryPolicy = new iam.PolicyStatement({
            actions: ["s3:GetObject"],
            resources: [`${s3ArchiveDataGlueBucket.bucket.bucketArn}/*`],
        });

        const glueCatalogPolicy = new iam.PolicyStatement({
            actions: ["glue:GetTable"],
            resources: [`arn:aws:glue:us-east-1:${awsAccountId}:catalog`],
        });

        const glueDatabasePolicy = new iam.PolicyStatement({
            actions: ["glue:GetTable"],
            resources: [`arn:aws:glue:us-east-1:${awsAccountId}:database/*`],
        });

        const glueTablePolicy = new iam.PolicyStatement({
            actions: ["glue:GetTable"],
            resources: [`arn:aws:glue:us-east-1:${awsAccountId}:table/*`],
        });

        const glueS3BucketPolicy = new iam.PolicyStatement({
            actions: [
                "s3:GetBucketLocation",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:ListBucketMultipartUploads",
                "s3:ListMultipartUploadParts",
                "s3:AbortMultipartUpload",
                "s3:CreateBucket",
                "s3:PutObject",
            ],
            resources: [
                s3GlueAssetBucket.bucket.bucketArn,
                s3AwsGlueTempBucket.bucket.bucketArn,
                s3ArchiveDataGlueBucket.bucket.bucketArn,
                s3AthenaTempBucket.bucket.bucketArn,
            ],
        });

        const awsGluePolicy = new iam.PolicyStatement({
            actions: [
                "glue:GetConnection",
                "glue:CreateConnection",
                "glue:CreateJob",
                "iam:PassRole",
                "glue:StartJobRun",
                "glue:CreateDatabase",
                "glue:CreateTable",
                "glue:GetDatabase",
                "glue:GetTable",
                "glue:GetJobRun",
            ],
            resources: [`arn:aws:glue:us-east-1:${awsAccountId}:*`],
        });

        const stateMachinePolicy = new iam.PolicyStatement({
            actions: ["states:StartExecution"],
            resources: [`arn:aws:states:us-east-1:${awsAccountId}:stateMachine:*`],
        });

        const awsGluePolicyTest = new iam.PolicyStatement({
            actions: ["iam:PassRole"],
            resources: [`arn:aws:iam::${awsAccountId}:*`],
        });

        const secretsmanagerCreateSecret = new iam.PolicyStatement({
            actions: ["secretsmanager:CreateSecret"],
            resources: [
                `arn:aws:secretsmanager:${awsRegion}:${awsAccountId}:secret:*`,
            ],
        });

        const secretsmanagerGetSecretValue = new iam.PolicyStatement({
            actions: ["secretsmanager:GetSecretValue"],
            resources: [
                `arn:aws:secretsmanager:${awsRegion}:${awsAccountId}:secret:*`,
            ],
        });

        /*
         * END
         * AWS IAM Policy Statements
         */

        /*
         * START
         * Test Connection & Get Database Schema.
         * Function added to the private subnet that
         * uses a NAT Gateway.
         * Lambda function and APIs
         */

        const testConnectionRole = new iam.Role(this, "LambdaTestConnectionRole", {
            roleName: "TestConnectionRole",
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            description: "IAM Role for the Test Connection Lambda",
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    "service-role/AWSLambdaVPCAccessExecutionRole"
                ),
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
            ],
        });

        // Create a security group for the RDS
        const rdsSecurityGroup = new ec2.SecurityGroup(this, "RdsSecurityGroup", {
            vpc: vpc,
            allowAllOutbound: true,
        });

        rdsSecurityGroup.addIngressRule(
            rdsSecurityGroup,
            ec2.Port.allTraffic(),
            `Allow all inbound traffic from ${rdsSecurityGroup.securityGroupId} security group (private subnet)`
        );

        this.testConnectionLambda = new lambdaPython.PythonFunction(
            this,
            "LambdaTestConnectionFn",
            {
                role: testConnectionRole,
                vpc: vpc,
                securityGroups: [rdsSecurityGroup],
                vpcSubnets: {
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                allowPublicSubnet: true,
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "main.py",
                entry: "../api/archive/source/test-connection",
                timeout: cdk.Duration.seconds(30),
                environment: {},
            }
        );

        new ApiGatewayV2LambdaConstruct(
            this,
            "LambdaTestConnection" + "ApiGateway",
            {
                lambdaFn: this.testConnectionLambda,
                routePath: "/api/archive/source/test-connection",
                methods: [apigwv2.HttpMethod.POST],
                api: api.apiGatewayV2,
            }
        );

        const databaseSchemaRole = new iam.Role(this, "DatabaseSchemaRole", {
            roleName: "DatabaseSchemaRole",
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            description: "IAM Role for the Test Connection Lambda",
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    "service-role/AWSLambdaVPCAccessExecutionRole"
                ),
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
            ],
        });

        this.databaseSchemaLambda = new lambdaPython.PythonFunction(
            this,
            "DatabaseSchemaConnectionFn",
            {
                role: databaseSchemaRole,
                vpc: vpc,
                securityGroups: [rdsSecurityGroup],
                vpcSubnets: {
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                allowPublicSubnet: true,
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "main.py",
                entry: "../api/archive/source/get-schema",
                timeout: cdk.Duration.seconds(30),
                environment: {},
            }
        );

        new ApiGatewayV2LambdaConstruct(this, "DatabaseSchema" + "ApiGateway", {
            lambdaFn: this.databaseSchemaLambda,
            routePath: "/api/archive/source/get-schema",
            methods: [apigwv2.HttpMethod.POST],
            api: api.apiGatewayV2,
        });

        /*
         * END
         * Test Connection & Get Database Schema.
         * Function added to the private subnet that
         * uses a NAT Gateway.
         * Lambda function and APIs
         */

        /*
         * START
         * CREATE DAS APIs
         */

        const apis = [
            {
                name: "CreateArchive",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "main.py",
                entry: "../api/archive/create",
                timeout: cdk.Duration.minutes(5),
                environment: {},
                routePath: "/api/archive/create",
                methods: [apigwv2.HttpMethod.POST],
                api: api.apiGatewayV2,
                iamInlinePolicy: [
                    dynamoDbWritePolicy,
                    ssmGetParameterPolicy,
                    secretsmanagerCreateSecret,
                ],
            },
            {
                name: "DeleteDatabaseItem",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "main.py",
                entry: "../api/archive/delete",
                timeout: cdk.Duration.minutes(5),
                environment: {},
                routePath: "/api/archive/delete",
                methods: [apigwv2.HttpMethod.POST],
                api: api.apiGatewayV2,
                iamInlinePolicy: [
                    dynamoDbReadOnlyPolicy,
                    dynamoDbWritePolicy,
                    ssmGetParameterPolicy,
                ],
            },
            {
                name: "ListArchives",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "main.py",
                entry: "../api/archives/list",
                timeout: cdk.Duration.minutes(5),
                environment: {},
                routePath: "/api/archives/list",
                methods: [apigwv2.HttpMethod.GET],
                api: api.apiGatewayV2,
                iamInlinePolicy: [
                    dynamoDbReadOnlyPolicy,
                    dynamoDbWritePolicy,
                    ssmGetParameterPolicy,
                ],
            },
            {
                name: "GetArchive",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "main.py",
                entry: "../api/archive/get",
                timeout: cdk.Duration.minutes(5),
                environment: {},
                routePath: "/api/archive/get",
                methods: [apigwv2.HttpMethod.POST],
                api: api.apiGatewayV2,
                iamInlinePolicy: [
                    dynamoDbReadOnlyPolicy,
                    dynamoDbWritePolicy,
                    ssmGetParameterPolicy,
                ],
            },
            {
                name: "RunArchiveJob",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "main.py",
                entry: "../api/job/run",
                timeout: cdk.Duration.minutes(5),
                environment: {},
                routePath: "/api/job/run",
                methods: [apigwv2.HttpMethod.POST],
                api: api.apiGatewayV2,
                iamInlinePolicy: [
                    dynamoDbReadOnlyPolicy,
                    dynamoDbWritePolicy,
                    ssmGetParameterPolicy,
                    stateMachinePolicy,
                    glueS3BucketPolicy,
                ],
            },
            {
                name: "AthenaQuery",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "main.py",
                entry: "../api/archive/query",
                timeout: cdk.Duration.minutes(15),
                environment: {},
                routePath: "/api/archive/query",
                methods: [apigwv2.HttpMethod.POST],
                api: api.apiGatewayV2,
                iamInlinePolicy: [
                    ssmGetParameterPolicy,
                    athenaPolicy,
                    s3GetObjectAthenaQueryPolicy,
                    glueCatalogPolicy,
                    glueDatabasePolicy,
                    glueTablePolicy,
                    glueS3BucketPolicy,
                ],
            },
        ];

        for (const val of apis) {
            new DasApiPythonConstruct(this, val.name, {
                name: val.name,
                runtime: val.runtime,
                handler: val.handler,
                index: val.index,
                entry: val.entry,
                timeout: val.timeout,
                environment: val.environment,
                routePath: val.routePath,
                methods: val.methods,
                api: val.api,
                iamInlinePolicy: val.iamInlinePolicy,
            });
        }

        /*
         * END
         * CREATE DAS APIs
         */

        /*
         * START
         * SQS FIFO Queue for Validation
         */

        const validationQueueFn = new lambdaPython.PythonFunction(
            this,
            "ValidationQueueFn",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "validation.py",
                entry: "../functions/sqs",
                timeout: cdk.Duration.seconds(60),
                environment: {},
            }
        );

        validationQueueFn.role?.attachInlinePolicy(
            new iam.Policy(this, "ValidationQueueFnPolicy", {
                statements: [
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                    ssmGetParameterPolicy,
                ],
            })
        );

        const sqsFifoValidation = new sqs.Queue(this, "ValidationQueue", {
            encryption: sqs.QueueEncryption.KMS_MANAGED,
            visibilityTimeout: Duration.seconds(60),
            fifo: true,
        });

        new ssm.StringParameter(this, "SqsFifoValidationParam", {
            parameterName: "/sqs/validation",
            stringValue: sqsFifoValidation.queueUrl,
            description: "Queue for tracking validation completion status",
            type: ssm.ParameterType.STRING,
            tier: ssm.ParameterTier.STANDARD,
            allowedPattern: ".*",
        });

        const sqsPolicy = new iam.PolicyStatement({
            actions: ["sqs:SendMessage"],
            resources: [
                `arn:aws:sqs:*:${awsAccountId}:${sqsFifoValidation.queueName}`,
            ],
        });

        validationQueueFn.addEventSource(new SqsEventSource(sqsFifoValidation, {}));

        /*
         * END
         * SQS FIFO Queue for Validation
         */

        const dynamoDBTableParam = new ssm.StringParameter(
            this,
            "DynamoDBTableParam",
            {
                parameterName: "/archive/dynamodb-table",
                stringValue: archiveTable.tableName,
                description: "Table name for archives.",
                type: ssm.ParameterType.STRING,
                tier: ssm.ParameterTier.STANDARD,
                allowedPattern: ".*",
            }
        );

        const queryDynamoDBTableParam = new ssm.StringParameter(
            this,
            "QueryDynamoDBTableParam",
            {
                parameterName: "/archive/query-lookup-dynamodb-table",
                stringValue: queryIdLookupTable.tableName,
                description: "Table name for validation query IDs.",
                type: ssm.ParameterType.STRING,
                tier: ssm.ParameterTier.STANDARD,
                allowedPattern: ".*",
            }
        );

        /*
         * START
         * AWS Glue Step Functions
         */
        const stepFunctionGlueStepOne = new lambdaPython.PythonFunction(
            this,
            "StepFunctionGlueStepOne",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "step-one-start-status.py",
                entry: "../step-functions/aws-glue-job",
                timeout: cdk.Duration.minutes(5),
                environment: {},
            }
        );

        const stepFunctionGlueStepTwo = new lambdaPython.PythonFunction(
            this,
            "StepFunctionGlueStepTwo",

            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "step-two-glue-connection.py",
                entry: "../step-functions/aws-glue-job",
                timeout: cdk.Duration.minutes(5),
                environment: {
                    AVAILABILITY_ZONE: subnets[0].availabilityZone,
                    SUBNET_ID: subnets[0].subnetId,
                    RDS_SECURITY_GROUP: rdsSecurityGroup.securityGroupId,
                    VPC_DEFAULT_SECURITY_GROUP: securityGroup,
                },
            }
        );

        const stepFunctionGlueStepThree = new lambdaPython.PythonFunction(
            this,
            "StepFunctionGlueStepThree",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "step-three-glue-database.py",
                entry: "../step-functions/aws-glue-job",
                timeout: cdk.Duration.minutes(5),
                environment: {},
            }
        );

        const stepFunctionGlueStepFour = new lambdaPython.PythonFunction(
            this,
            "StepFunctionGlueStepFour",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "step-four-glue-tables.py",
                entry: "../step-functions/aws-glue-job",
                timeout: cdk.Duration.minutes(5),
                environment: {},
            }
        );

        const stepFunctionGlueStepSix = new lambdaPython.PythonFunction(
            this,
            "StepFunctionGlueStepSix",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "step-six-glue-job.py",
                entry: "../step-functions/aws-glue-job",
                timeout: cdk.Duration.minutes(5),
                environment: {
                    REGION: awsRegion,
                },
            }
        );

        const stepFunctionGlueStepSeven = new lambdaPython.PythonFunction(
            this,
            "StepFunctionGlueStepSeven",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "step-seven-map-output.py",
                entry: "../step-functions/aws-glue-job",
                timeout: cdk.Duration.minutes(5),
                environment: {
                    REGION: awsRegion,
                },
            }
        );

        const stepFunctionGlueStepNine = new lambdaPython.PythonFunction(
            this,
            "StepFunctionGlueStepNine",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "step-nine-start-jobs.py",
                entry: "../step-functions/aws-glue-job",
                timeout: cdk.Duration.minutes(5),
                environment: {},
            }
        );

        stepFunctionGlueStepOne.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionGlueStepOnePolicy", {
                statements: [
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                    ssmGetParameterPolicy,
                ],
            })
        );

        stepFunctionGlueStepTwo.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionGlueStepTwoPolicy", {
                statements: [
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                    ssmGetParameterPolicy,
                    awsGluePolicy,
                    secretsmanagerGetSecretValue,
                ],
            })
        );

        stepFunctionGlueStepThree.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionGlueStepThreePolicy", {
                statements: [
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                    ssmGetParameterPolicy,
                    awsGluePolicy,
                ],
            })
        );

        stepFunctionGlueStepFour.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionGlueStepFourPolicy", {
                statements: [
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                    ssmGetParameterPolicy,
                    awsGluePolicy,
                ],
            })
        );

        stepFunctionGlueStepSix.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionGlueStepSixPolicy", {
                statements: [
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                    ssmGetParameterPolicy,
                    awsGluePolicy,
                    awsGluePolicyTest,
                ],
            })
        );

        stepFunctionGlueStepSeven.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionGlueStepSevenPolicy", {
                statements: [
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                    ssmGetParameterPolicy,
                    awsGluePolicy,
                    awsGluePolicyTest,
                ],
            })
        );

        stepFunctionGlueStepNine.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionGlueStepNinePolicy", {
                statements: [
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                    ssmGetParameterPolicy,
                    awsGluePolicy,
                    awsGluePolicyTest,
                ],
            })
        );

        const definition = new cdk.aws_stepfunctions_tasks.LambdaInvoke(
            this,
            "Step One - Start Status",
            {
                lambdaFunction: stepFunctionGlueStepOne,
                outputPath: "$.Payload",
            }
        )
            .next(
                new cdk.aws_stepfunctions_tasks.LambdaInvoke(
                    this,
                    "Step Two - Glue Connection",
                    {
                        lambdaFunction: stepFunctionGlueStepTwo,
                        outputPath: "$.Payload",
                    }
                )
            )
            .next(
                new cdk.aws_stepfunctions_tasks.LambdaInvoke(
                    this,
                    "Step Three - Glue Database",
                    {
                        lambdaFunction: stepFunctionGlueStepThree,
                        outputPath: "$.Payload",
                    }
                )
            )
            .next(
                new cdk.aws_stepfunctions_tasks.LambdaInvoke(
                    this,
                    "Step Four - Glue Tables",
                    {
                        lambdaFunction: stepFunctionGlueStepFour,
                        outputPath: "$.Payload",
                    }
                )
            )
            .next(
                new cdk.aws_stepfunctions.Map(this, "Step Five - Map Database Tables", {
                    maxConcurrency: 10,
                    itemsPath: cdk.aws_stepfunctions.JsonPath.stringAt("$.Payload"),
                }).iterator(
                    new cdk.aws_stepfunctions_tasks.LambdaInvoke(
                        this,
                        "Step Six - Glue Job",
                        {
                            lambdaFunction: stepFunctionGlueStepSix,
                            outputPath: "$.Payload",
                        }
                    )
                )
            )
            .next(
                new cdk.aws_stepfunctions_tasks.LambdaInvoke(
                    this,
                    "Step Seven - Map Output",
                    {
                        lambdaFunction: stepFunctionGlueStepSeven,
                        outputPath: "$.Payload",
                    }
                )
            )
            .next(
                new cdk.aws_stepfunctions.Map(
                    this,
                    "Step Eight - Map Database Tables",
                    {
                        maxConcurrency: 10,
                        itemsPath: cdk.aws_stepfunctions.JsonPath.stringAt("$.Payload"),
                    }
                ).iterator(
                    new cdk.aws_stepfunctions_tasks.LambdaInvoke(
                        this,
                        "Step Nine - Glue Job",
                        {
                            lambdaFunction: stepFunctionGlueStepNine,
                            outputPath: "$.Payload",
                        }
                    )
                )
            );

        const logGroup = new cdk.aws_logs.LogGroup(this, "GlueStateMachineLog", {
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const stateMachine = new cdk.aws_stepfunctions.StateMachine(
            this,
            "GlueStateMachine",
            {
                definition,
                tracingEnabled: true,
                logs: {
                    destination: logGroup,
                    level: cdk.aws_stepfunctions.LogLevel.ALL,
                },
            }
        );

        const createStateMachineParam = new ssm.StringParameter(
            this,
            "CreateStateMachineParam",
            {
                parameterName: "/job/step-functions-state-machine",
                stringValue: `arn:aws:states:us-east-1:${awsAccountId}:stateMachine:${stateMachine.stateMachineName}`,
                description: "Name for state machine",
                type: ssm.ParameterType.STRING,
                tier: ssm.ParameterTier.STANDARD,
                allowedPattern: ".*",
            }
        );

        new cdk.aws_s3_deployment.BucketDeployment(this, "DeployFiles", {
            sources: [
                cdk.aws_s3_deployment.Source.asset("./assets/aws-glue-scripts"),
            ],
            destinationBucket: s3GlueAssetBucket.bucket,
        });

        /*
         * END
         * AWS Glue Step Functions
         */

        /*
         * START
         * Athena Validation Functions
         */

        const stepFunctionValidationStepOne = new lambdaPython.PythonFunction(
            this,
            "StepFunctionValidationStepOne",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "step-one-get-schema.py",
                entry: "../step-functions/validation",
                timeout: cdk.Duration.minutes(5),
                environment: {},
            }
        );

        stepFunctionValidationStepOne.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionValidationStepOnePolicy", {
                statements: [
                    ssmGetParameterPolicy,
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                ],
            })
        );

        const stepFunctionValidationStepThree = new lambdaPython.PythonFunction(
            this,
            "StepFunctionValidationStepThree",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "step-three-output-validation.py",
                entry: "../step-functions/validation",
                timeout: cdk.Duration.minutes(5),
                environment: {},
            }
        );

        stepFunctionValidationStepThree.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionValidationStepThreePolicy", {})
        );

        const stepFunctionValidationCount = new lambdaPython.PythonFunction(
            this,
            "StepFunctionValidationStepTwo",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "count-validation.py",
                entry: "../step-functions/validation",
                timeout: cdk.Duration.minutes(5),
                environment: {},
            }
        );

        stepFunctionValidationCount.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionValidationStepTwoPolicy", {
                statements: [
                    ssmGetParameterPolicy,
                    athenaPolicy,
                    awsGluePolicy,
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                ],
            })
        );

        stepFunctionValidationCount.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionValidationCountInlinePolicy", {
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "s3:GetBucketLocation",
                            "s3:GetObject",
                            "s3:ListBucket",
                            "s3:ListBucketMultipartUploads",
                            "s3:ListMultipartUploadParts",
                            "s3:AbortMultipartUpload",
                            "s3:CreateBucket",
                            "s3:PutObject",
                        ],
                        resources: ["*"],
                    }),
                ],
            })
        );

        const stepFunctionValidationString = new lambdaPython.PythonFunction(
            this,
            "StepFunctionValidationString",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "string-validation.py",
                entry: "../step-functions/validation",
                timeout: cdk.Duration.minutes(5),
                environment: {},
            }
        );

        stepFunctionValidationString.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionValidationStringPolicy", {
                statements: [
                    ssmGetParameterPolicy,
                    athenaPolicy,
                    awsGluePolicy,
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                ],
            })
        );

        stepFunctionValidationString.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionValidationStringInlinePolicy", {
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "s3:GetBucketLocation",
                            "s3:GetObject",
                            "s3:ListBucket",
                            "s3:ListBucketMultipartUploads",
                            "s3:ListMultipartUploadParts",
                            "s3:AbortMultipartUpload",
                            "s3:CreateBucket",
                            "s3:PutObject",
                        ],
                        resources: ["*"],
                    }),
                ],
            })
        );

        const stepFunctionValidationNumber = new lambdaPython.PythonFunction(
            this,
            "StepFunctionValidationNumber",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "number-validation.py",
                entry: "../step-functions/validation",
                timeout: cdk.Duration.minutes(5),
                environment: {},
            }
        );

        stepFunctionValidationNumber.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionValidationNumberPolicy", {
                statements: [
                    ssmGetParameterPolicy,
                    athenaPolicy,
                    awsGluePolicy,
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                ],
            })
        );

        stepFunctionValidationNumber.role?.attachInlinePolicy(
            new iam.Policy(this, "StepFunctionValidationNumberInlinePolicy", {
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "s3:GetBucketLocation",
                            "s3:GetObject",
                            "s3:ListBucket",
                            "s3:ListBucketMultipartUploads",
                            "s3:ListMultipartUploadParts",
                            "s3:AbortMultipartUpload",
                            "s3:CreateBucket",
                            "s3:PutObject",
                        ],
                        resources: ["*"],
                    }),
                ],
            })
        );

        const validationDefinition = new cdk.aws_stepfunctions_tasks.LambdaInvoke(
            this,
            "Step One - Get Schema",
            {
                lambdaFunction: stepFunctionValidationStepOne,
                outputPath: "$.Payload",
            }
        ).next(
            new cdk.aws_stepfunctions.Map(this, "Step Two - Map Validations", {
                maxConcurrency: 10,
                itemsPath: cdk.aws_stepfunctions.JsonPath.stringAt("$.Payload"),
            }).iterator(
                new cdk.aws_stepfunctions.Choice(this, "EvaluateValidation")
                    .when(
                        cdk.aws_stepfunctions.Condition.stringEquals(
                            "$.validation_type",
                            "count_validation"
                        ),
                        new cdk.aws_stepfunctions_tasks.LambdaInvoke(
                            this,
                            "Count Validation",
                            {
                                lambdaFunction: stepFunctionValidationCount,
                                outputPath: "$.Payload",
                            }
                        )
                    )
                    .when(
                        cdk.aws_stepfunctions.Condition.stringEquals(
                            "$.validation_type",
                            "number_validation"
                        ),
                        new cdk.aws_stepfunctions_tasks.LambdaInvoke(
                            this,
                            "Number Validation",
                            {
                                lambdaFunction: stepFunctionValidationNumber,
                                outputPath: "$.Payload",
                            }
                        )
                    )
                    .when(
                        cdk.aws_stepfunctions.Condition.stringEquals(
                            "$.validation_type",
                            "string_validation"
                        ),
                        new cdk.aws_stepfunctions_tasks.LambdaInvoke(
                            this,
                            "String Validation",
                            {
                                lambdaFunction: stepFunctionValidationString,
                                outputPath: "$.Payload",
                            }
                        )
                    )
            )
        );

        const validationLogGroup = new cdk.aws_logs.LogGroup(
            this,
            "ValidationStateMachineLog",
            {
                removalPolicy: RemovalPolicy.DESTROY,
            }
        );

        const validationStateMachine = new cdk.aws_stepfunctions.StateMachine(
            this,
            "ValidationStateMachine",
            {
                definition: validationDefinition,
                tracingEnabled: true,
                logs: {
                    destination: validationLogGroup,
                    level: cdk.aws_stepfunctions.LogLevel.ALL,
                },
            }
        );

        const createValidationStateMachineParam = new ssm.StringParameter(
            this,
            "CreateValidationStateMachineParam",
            {
                parameterName: "/job/sf-validation-state-machine",
                stringValue: `arn:aws:states:us-east-1:${awsAccountId}:stateMachine:${validationStateMachine.stateMachineName}`,
                description: "Name for state machine",
                type: ssm.ParameterType.STRING,
                tier: ssm.ParameterTier.STANDARD,
                allowedPattern: ".*",
            }
        );

        /*
         * END
         * Athena Validation Functions
         */

        /*
         * START
         * Functions, Events and Roles for EventBridge
         */

        const glueJobStatusFn = new lambdaPython.PythonFunction(
            this,
            "GlueJobStatusFn",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "glue-job-status.py",
                entry: "../functions/eventbridge",
                timeout: cdk.Duration.seconds(30),
                environment: {
                    ARCHIVE_TABLE: archiveTable.tableName,
                    VALIDATION_STATE_MACHINE: validationStateMachine.stateMachineArn,
                },
            }
        );

        const athenaJobStatusFn = new lambdaPython.PythonFunction(
            this,
            "AthenaJobStatusFn",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "athena-job-status.py",
                entry: "../functions/eventbridge",
                timeout: cdk.Duration.minutes(15),
                environment: {},
            }
        );

        glueJobStatusFn.role?.attachInlinePolicy(
            new iam.Policy(this, "GlueJobStatusFnPolicy", {
                statements: [
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                    ssmGetParameterPolicy,
                    awsGluePolicy,
                    awsGluePolicyTest,
                    stateMachinePolicy,
                ],
            })
        );

        athenaJobStatusFn.role?.attachInlinePolicy(
            new iam.Policy(this, "AthenaJobStatusFnPolicy", {
                statements: [
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                    ssmGetParameterPolicy,
                    awsGluePolicy,
                    awsGluePolicyTest,
                    stateMachinePolicy,
                    athenaPolicy,
                    sqsPolicy,
                ],
            })
        );

        athenaJobStatusFn.role?.attachInlinePolicy(
            new iam.Policy(this, "AthenaJobStatusFnInlinePolicy", {
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "s3:GetBucketLocation",
                            "s3:GetObject",
                            "s3:ListBucket",
                            "s3:ListBucketMultipartUploads",
                            "s3:ListMultipartUploadParts",
                            "s3:AbortMultipartUpload",
                            "s3:CreateBucket",
                            "s3:PutObject",
                        ],
                        resources: ["*"],
                    }),
                ],
            })
        );

        new cdk.aws_events.Rule(this, `GlueJobStatusRule`, {
            eventPattern: {
                source: [`aws.glue`],
                detailType: ["Glue Job State Change"],
            },
            targets: [new cdk.aws_events_targets.LambdaFunction(glueJobStatusFn)],
        });

        new cdk.aws_events.Rule(this, `AthenaJobStatusRule`, {
            eventPattern: {
                source: [`aws.athena`],
                detailType: ["Athena Query State Change"],
            },
            targets: [new cdk.aws_events_targets.LambdaFunction(athenaJobStatusFn)],
        });

        /*
         * END
         * Functions, Events and Roles for EventBridge
         */

        // [START] Legal Hold

        const legalHold = new lambdaPython.PythonFunction(this, "LegalHoldFn", {
            runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
            handler: "lambda_handler",
            index: "main.py",
            entry: "../api/archive/legal",
            timeout: cdk.Duration.minutes(15),
            environment: {},
        });

        new ApiGatewayV2LambdaConstruct(this, "LegalHoldGateway", {
            lambdaFn: legalHold,
            routePath: "/api/archive/legal",
            methods: [apigwv2.HttpMethod.POST],
            api: api.apiGatewayV2,
        });

        legalHold.role?.attachInlinePolicy(
            new iam.Policy(this, "LegalHoldPolicy", {
                statements: [
                    dynamoDbReadOnlyPolicy,
                    ssmGetParameterPolicy,
                    dynamoDbWritePolicy,
                ],
            })
        );

        legalHold.role?.attachInlinePolicy(
            new iam.Policy(this, "LegalHoldInlinePolicy", {
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "s3:GetBucketLocation",
                            "s3:GetObject",
                            "s3:ListBucket",
                            "s3:ListBucketMultipartUploads",
                            "s3:ListMultipartUploadParts",
                            "s3:AbortMultipartUpload",
                            "s3:CreateBucket",
                            "s3:PutObject",
                            "s3:PutObjectLegalHold",
                        ],
                        resources: ["*"],
                    }),
                ],
            })
        );

        // [END] Legal Hold

        // [START] Expiration

        const expiration = new lambdaPython.PythonFunction(this, "ExpirationFn", {
            runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
            handler: "lambda_handler",
            index: "main.py",
            entry: "../api/archive/expiration",
            timeout: cdk.Duration.minutes(15),
            environment: {},
        });

        new ApiGatewayV2LambdaConstruct(this, "ExpirationGateway", {
            lambdaFn: expiration,
            routePath: "/api/archive/expiration",
            methods: [apigwv2.HttpMethod.POST],
            api: api.apiGatewayV2,
        });

        expiration.role?.attachInlinePolicy(
            new iam.Policy(this, "ExpirationPolicy", {
                statements: [
                    dynamoDbReadOnlyPolicy,
                    ssmGetParameterPolicy,
                    dynamoDbWritePolicy,
                ],
            })
        );

        expiration.role?.attachInlinePolicy(
            new iam.Policy(this, "ExpirationInlinePolicy", {
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "s3:GetBucketLocation",
                            "s3:GetObject",
                            "s3:ListBucket",
                            "s3:ListBucketMultipartUploads",
                            "s3:ListMultipartUploadParts",
                            "s3:AbortMultipartUpload",
                            "s3:PutBucketLifecycleConfiguration",
                            "s3:PutLifecycleConfiguration",
                        ],
                        resources: ["*"],
                    }),
                ],
            })
        );

        // [END] Expiration

        // [START] api/archive/validate
        const validateArchive = new lambdaPython.PythonFunction(
            this,
            "ValidateArchiveFn",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "main.py",
                entry: "../api/archive/validate",
                timeout: cdk.Duration.minutes(5),
                environment: {},
            }
        );

        new ApiGatewayV2LambdaConstruct(this, "ValidateArchiveApiGateway", {
            lambdaFn: validateArchive,
            routePath: "/api/archive/validate",
            methods: [apigwv2.HttpMethod.POST],
            api: api.apiGatewayV2,
        });

        validateArchive.role?.attachInlinePolicy(
            new iam.Policy(this, "ValidateArchiveFnPolicy", {
                statements: [
                    ssmGetParameterPolicy,
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                ],
            })
        );

        // [END] api/archive/archive

        // [START] api/archive/archive
        const archive = new lambdaPython.PythonFunction(this, "ArchiveFn", {
            runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
            handler: "lambda_handler",
            index: "main.py",
            entry: "../api/archive/archive",
            timeout: cdk.Duration.minutes(5),
            environment: {},
        });

        new ApiGatewayV2LambdaConstruct(this, "ArchiveApiGateway", {
            lambdaFn: archive,
            routePath: "/api/archive/archive",
            methods: [apigwv2.HttpMethod.POST],
            api: api.apiGatewayV2,
        });

        archive.role?.attachInlinePolicy(
            new iam.Policy(this, "ArchiveFnPolicy", {
                statements: [
                    ssmGetParameterPolicy,
                    dynamoDbWritePolicy,
                    dynamoDbReadOnlyPolicy,
                ],
            })
        );

        // [END] api/archive/archive
    }
}
