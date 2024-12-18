import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { v4 as uuidv4 } from 'uuid';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

function getShortUuidSegment(): string {
	const fullUuid = uuidv4();
	return fullUuid.split('-')[0];
}

export interface CloudFrontS3WebSiteConstructProps extends cdk.StackProps {
	readonly webSiteBuildPath: string;
	readonly webAclArn?: string;
}

export class CloudFrontS3WebSiteConstruct extends Construct {
	/**
	 * The CloudFront distribution for the website
	 */
	public readonly cloudFrontDistribution: cloudfront.Distribution;

	constructor(
		parent: Construct,
		name: string,
		props: CloudFrontS3WebSiteConstructProps
	) {
		super(parent, name);

		const siteBucket = new s3.Bucket(this, 'WebApp', {
			bucketName: `webapp-${getShortUuidSegment()}`,
			encryption: s3.BucketEncryption.S3_MANAGED,
			autoDeleteObjects: true,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			enforceSSL: true,
			serverAccessLogsPrefix: '/access-logs/',
			versioned: true,
		});

		// Enforce HTTPS-only access
		siteBucket.addToResourcePolicy(
			new iam.PolicyStatement({
				sid: 'EnforceTLS',
				effect: iam.Effect.DENY,
				principals: [new iam.AnyPrincipal()],
				actions: ['s3:*'],
				resources: [siteBucket.bucketArn, `${siteBucket.bucketArn}/*`],
				conditions: { Bool: { 'aws:SecureTransport': 'false' } },
			})
		);

		// Create Origin Access Identity (OAI)
		const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
			comment: 'OAI for CloudFront to access S3 bucket securely',
		});

		// Grant CloudFront read access to the S3 bucket
		siteBucket.grantRead(oai);

		// Define the CloudFront Distribution
		this.cloudFrontDistribution = new cloudfront.Distribution(
			this,
			'WebAppDistribution',
			{
				defaultBehavior: {
					origin: origins.S3BucketOrigin.withOriginAccessControl(
						siteBucket
					),
					cachePolicy: new cloudfront.CachePolicy(
						this,
						'CachePolicy',
						{
							defaultTtl: cdk.Duration.hours(1),
							minTtl: cdk.Duration.minutes(1),
							maxTtl: cdk.Duration.days(1),
							enableAcceptEncodingGzip: true,
							enableAcceptEncodingBrotli: true,
						}
					),
					allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
					viewerProtocolPolicy:
						cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
				},
				errorResponses: [
					{
						httpStatus: 403,
						responseHttpStatus: 200,
						responsePagePath: '/index.html',
						ttl: cdk.Duration.minutes(30),
					},
					{
						httpStatus: 404,
						responseHttpStatus: 200,
						responsePagePath: '/index.html',
						ttl: cdk.Duration.minutes(30),
					},
				],
				defaultRootObject: 'index.html',
				webAclId: props.webAclArn,
				minimumProtocolVersion:
					cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
			}
		);

		// Deploy website assets to S3 bucket
		new s3deployment.BucketDeployment(this, 'DeployWithInvalidation', {
			sources: [s3deployment.Source.asset(props.webSiteBuildPath)],
			destinationBucket: siteBucket,
			distribution: this.cloudFrontDistribution,
			distributionPaths: ['/*'],
		});

		new cdk.CfnOutput(this, 'CloudFrontDistributionDomainName', {
			value: this.cloudFrontDistribution.distributionDomainName,
		});
		new cdk.CfnOutput(this, 'SiteBucketName', {
			value: siteBucket.bucketName,
		});
	}
}
