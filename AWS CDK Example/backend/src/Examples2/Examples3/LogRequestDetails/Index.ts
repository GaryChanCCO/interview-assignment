import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { tables } from 'src/shared/Constants';
import 'source-map-support/register';

interface Res {
    ip: string;
}

export const handler: APIGatewayProxyHandlerV2<Res> = async (event, context) => {
    try {
        console.log(JSON.stringify(event));
        const dynamodbClient = new DynamoDBClient({});
        await dynamodbClient.send(
            new PutItemCommand({
                TableName: tables.Stat.name,
                Item: marshall({ ip: event.requestContext.http.sourceIp, timestamp: new Date().valueOf() }),
            })
        );
        return {};
    } catch (e) {
        console.error(e);
        return {
            statusCode: 500,
        };
    }
};
export default handler;
