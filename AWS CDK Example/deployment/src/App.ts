import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiStack } from './Stacks/ApiStack';
import { BackendStack } from './Stacks/BackendStack';
import { DbStack } from './Stacks/DbStack';
import { FrontendStack } from './Stacks/FrontendStack';

export class AppStack extends cdk.Stack {
    public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const dbStack = new DbStack(this, 'DbStack', {});
        const frontendStack = new FrontendStack(this, 'FrontendStack', {});
        const backendStack = new BackendStack(this, 'BackendStack', {});
        const apiStack = new ApiStack(this, 'ApiStack', {});

        new cdk.CfnOutput(this, 'frontend-url', {
            value: frontendStack.distribution.domainName,
            exportName: 'frontend-url',
        });
    }
}

const app = new cdk.App();
new AppStack(app, 'aws-cdk-example', {
    stackName: 'aws-cdk-example',
});
