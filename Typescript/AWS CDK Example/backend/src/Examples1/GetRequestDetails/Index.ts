import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import 'source-map-support/register';

interface Res {
    ip: string;
}

export const handler: APIGatewayProxyHandlerV2<Res> = async (event, context) => {
    try {
        console.log(event);
        return {
            ip: event.requestContext.http.sourceIp,
        };
    } catch (e) {
        console.error(e);
        return {
            statusCode: 500,
        };
    }
};
export default handler;
