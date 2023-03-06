import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as esbuild from 'esbuild';
import * as fs from 'fs-extra';
import * as glob from 'glob';
import forge from 'node-forge';
import * as path from 'path';
import { getEnvVar } from 'src/Env';

// eslint-disable-next-line @typescript-eslint/ban-types
export type ApiStackProps = {} & cdk.NestedStackProps;

export class ApiStack extends cdk.NestedStack {
    public readonly route2func: Record<string, lambda.Function> = {};

    public constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        const apiGateway = new apigateway.RestApi(this, 'apiGateway', {
            restApiName: 'api',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
            },
            deployOptions: {
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
            },
        });

        const execRole = new iam.Role(this, 'execRole', {
            roleName: 'ApiLambdaExecRole',
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
        });

        //lambda functions
        {
            const rootDir = getEnvVar('API_DIR');
            const handlerIndexs = glob.sync('**/Index.ts', { cwd: path.join(rootDir, 'src') });
            fs.removeSync(path.join(rootDir, 'dist'));
            esbuild.buildSync({
                entryPoints: handlerIndexs.map((rel) => path.join(rootDir, 'src', rel)),
                bundle: true,
                sourcemap: 'inline',
                platform: 'node',
                target: 'node16',
                outdir: path.join(rootDir, 'dist'),
                outbase: path.join(rootDir, 'src'),
            });
            for (const handlerIndex of handlerIndexs) {
                const handlerSrcDir = path.join(rootDir, 'src', path.dirname(handlerIndex));
                const handlerDistDir = path.join(rootDir, 'dist', path.dirname(handlerIndex));
                const funcNameSuffix = forge.md.md5.create().update(handlerDistDir).digest().toHex();
                const route = `/${path.dirname(handlerIndex)}`;
                const func = new lambda.Function(this, `lambda.Function-${funcNameSuffix}`, {
                    role: execRole,
                    functionName: `Apid-${funcNameSuffix}`,
                    code: lambda.Code.fromAsset(handlerDistDir),
                    runtime: lambda.Runtime.NODEJS_16_X,
                    handler: 'Index.handler',
                    timeout: cdk.Duration.minutes(1),
                    description: route,
                });
                this.route2func[route] = func;
                const routeParts = route.split(/[\\/]/).filter((part) => part.length > 0);
                let currResource = apiGateway.root;
                for (const part of routeParts) {
                    currResource = currResource.getResource(part) ?? currResource.addResource(part);
                }
                for (const httpMethod of ['GET', 'POST', 'PUT', 'DELETE']) {
                    currResource.addMethod(httpMethod, new apigateway.LambdaIntegration(func, {}), {});
                }
            }
        }
    }
}
