import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as path from 'path';
import { getEnvVar } from '../Env';

// eslint-disable-next-line @typescript-eslint/ban-types
export type FrontendStackProps = {} & cdk.NestedStackProps;

export class FrontendStack extends cdk.NestedStack {
    public readonly distribution: cloudfront.Distribution;

    constructor(scope: Construct, id: string, props: FrontendStackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'bucket', {
            bucketName: `frontend-${this.account}`,
            accessControl: s3.BucketAccessControl.PUBLIC_READ,
        });

        const webDeployment = new s3deploy.BucketDeployment(this, 'webDeployment', {
            sources: [s3deploy.Source.asset(path.join(getEnvVar('FRONTEND_DIR'), 'dist'))],
            destinationBucket: bucket,
            retainOnDelete: false,
        });

        this.distribution = new cloudfront.Distribution(this, 'distribution', {
            defaultBehavior: {
                origin: new S3Origin(bucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
            ],
            defaultRootObject: 'index.html',
        });
    }
}
