import type { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import { tables } from 'src/shared/Constants';

export const handler: APIGatewayProxyHandler = async (event, context) => {
    try {
        console.log(event);
        return {
            statusCode: 200,
            body: JSON.stringify({
                text1: event.pathParameters!['text1'],
                tables: tables,
                method: event.httpMethod,
            }),
        };
    } catch (e) {
        console.error(e);
        return {
            statusCode: 500,
            body: '',
        };
    }
};
export default handler;
