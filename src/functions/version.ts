import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from "../db";

export async function version(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        const sql = require('mssql');
        const pool = await getPool();
        context.log('SQL connected successfully');

        const result = await pool.request()
            .input('id', sql.Int, request.params.id)
            .input('version', sql.Int, request.params.version)
            .query("select * from versions where assignment_id = @id and version_number = @version");
        const row = result.recordset[0];

        return {
            status: 200,
            body: JSON.stringify({
                result: row
            }),
            headers: { 'Content-Type': 'application/json' }
        }
    } catch (err) {
        context.log(`SQL connection failed: ${(err as Error).message}`);
        return {
            status: 500,
            body: JSON.stringify({ error: (err as Error).message }),
            headers: { 'Content-Type': 'application/json' }
        };
    }
};

app.http('version', {
    route: 'meta/doc/{id}/{version}',
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: version
});
