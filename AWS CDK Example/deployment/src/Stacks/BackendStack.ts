import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpUserPoolAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as events from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as esbuild from 'esbuild';
import * as fs from 'fs-extra';
import * as glob from 'glob';
import forge from 'node-forge';
import * as path from 'path';
import { getEnvVar } from 'src/Env';

const funcConfJson = 'func.json';
interface FuncConf {
    memorySize?: number;
    needAuthorization?: boolean;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type BackendStackProps = {} & cdk.NestedStackProps;

export class BackendStack extends cdk.NestedStack {
    public readonly route2func: Record<string, lambda.Function> = {};

    public constructor(scope: Construct, id: string, props: BackendStackProps) {
        super(scope, id, props);

        const userPool = new cognito.UserPool(scope, 'userpool', {
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            standardAttributes: {
                email: { required: true, mutable: true },
            },
            signInAliases: {
                email: true,
            },
            userPoolName: 'example-pool',
            signInCaseSensitive: false,
            selfSignUpEnabled: true,
            customAttributes: {
                clientId: new cognito.StringAttribute({ minLen: 0, maxLen: 256, mutable: true }),
            },
        });

        const execRole = new iam.Role(this, 'execRole', {
            roleName: 'BackendLambdaExecRole',
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
            inlinePolicies: {
                default: new iam.PolicyDocument({
                    assignSids: true,
                    statements: [
                        new iam.PolicyStatement({
                            actions: [
                                'dynamodb:BatchGetItem',
                                'dynamodb:BatchWriteItem',
                                'dynamodb:ConditionCheckItem',
                                'dynamodb:PutItem',
                                'dynamodb:DescribeTable',
                                'dynamodb:DeleteItem',
                                'dynamodb:GetItem',
                                'dynamodb:Scan',
                                'dynamodb:Query',
                                'dynamodb:UpdateItem',
                                'dynamodb:DescribeStream',
                                'dynamodb:GetRecords',
                                'dynamodb:GetShardIterator',
                                'dynamodb:ListStreams',
                            ],
                            resources: [`arn:aws:dynamodb:ca-central-1:${this.account}:table/*`],
                        }),
                    ],
                }),
            },
        });

        const httpApi = new apigatewayv2.HttpApi(this, 'httpApi', {
            apiName: 'backend',
            corsPreflight: {
                allowOrigins: ['*'],
                allowMethods: [apigatewayv2.CorsHttpMethod.OPTIONS, apigatewayv2.CorsHttpMethod.POST],
                allowHeaders: ['authorization', 'content-type'],
                maxAge: cdk.Duration.days(10),
            },
            //defaultAuthorizer: new HttpUserPoolAuthorizer('cognito', userPool),
        });

        const authorizer = new HttpUserPoolAuthorizer(HttpLambdaIntegration.name, userPool, {});

        //lambda functions
        {
            const rootDir = getEnvVar('BACKEND_DIR');
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
                let funcConf: FuncConf = {};
                const funcConfJsonFile = path.join(handlerSrcDir, funcConfJson);
                if (fs.existsSync(funcConfJsonFile)) {
                    const json = fs.readFileSync(funcConfJsonFile, 'utf-8');
                    funcConf = JSON.parse(json);
                }
                const funcNameSuffix = forge.md.md5.create().update(handlerDistDir).digest().toHex();
                const route = `/${path.dirname(handlerIndex)}`;
                const func = new lambda.Function(this, `lambda.Function-${funcNameSuffix}`, {
                    role: execRole,
                    functionName: `Backend-${funcNameSuffix}`,
                    code: lambda.Code.fromAsset(handlerDistDir),
                    runtime: lambda.Runtime.NODEJS_16_X,
                    handler: 'Index.handler',
                    memorySize: funcConf.memorySize,
                    timeout: cdk.Duration.minutes(1),
                    description: route,
                });
                cdk.Tags.of(func).add('srcDir', path.dirname(handlerIndex));
                this.route2func[route] = func;

                httpApi.addRoutes({
                    path: route,
                    integration: new HttpLambdaIntegration(`HttpLambdaIntegration-${funcNameSuffix}`, func),
                    methods: [apigatewayv2.HttpMethod.POST],
                    authorizer: funcConf.needAuthorization ? authorizer : undefined,
                });
            }
        }

        const exampleRule = new events.Rule(this, 'exampleRule', {
            ruleName: 'exampleRule',
            targets: [
                new LambdaFunctionTarget(
                    this.route2func[Object.keys(this.route2func).find((route) => route.includes('ProduceError'))!]!
                ),
            ],
            schedule: events.Schedule.cron({ minute: '5' }),
        });
    }
}
