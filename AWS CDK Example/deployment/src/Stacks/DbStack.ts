import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DbStack extends cdk.NestedStack {
    public readonly stat: dynamodb.Table;

    public constructor(scope: Construct, id: string, props: cdk.NestedStackProps) {
        super(scope, id, props);

        const createTable: (arg: {
            tableName: string;
            partitionKey: {
                name: string;
                /**
                 * @default dynamodb.AttributeType.STRING
                 */
                type?: dynamodb.AttributeType;
            };
            sortKey?: {
                name: string;
                /**
                 * @default dynamodb.AttributeType.STRING
                 */
                type?: dynamodb.AttributeType;
            };
            /**
             * @default dynamodb.BillingMode.PAY_PER_REQUEST
             */
            billingMode?: dynamodb.TableProps['billingMode'];
            stream?: dynamodb.TableProps['stream'];
            timeToLiveAttribute?: dynamodb.TableProps['timeToLiveAttribute'];
        }) => dynamodb.Table = (arg) => {
            return new dynamodb.Table(this, arg.tableName, {
                tableName: arg.tableName,
                partitionKey: {
                    name: arg.partitionKey.name,
                    type: arg.partitionKey.type ?? dynamodb.AttributeType.STRING,
                },
                sortKey:
                    arg.sortKey === undefined
                        ? undefined
                        : {
                              name: arg.sortKey.name,
                              type: arg.sortKey.type ?? dynamodb.AttributeType.STRING,
                          },
                billingMode: arg.billingMode ?? dynamodb.BillingMode.PAY_PER_REQUEST,
                stream: arg.stream,
                timeToLiveAttribute: arg.timeToLiveAttribute,
                removalPolicy: cdk.RemovalPolicy.RETAIN,
            });
        };

        //#region Stat
        this.stat = createTable({
            tableName: 'Stat',
            partitionKey: {
                name: 'ip',
            },
            sortKey: {
                name: 'timestamp',
                type: dynamodb.AttributeType.NUMBER,
            },
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        });

        this.stat.addGlobalSecondaryIndex({
            indexName: 'clientId-dateTime',
            partitionKey: {
                name: 'ip',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'type',
                type: dynamodb.AttributeType.STRING,
            },
        });
        //#endregion Stat
    }
}
