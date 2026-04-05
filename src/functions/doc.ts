import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from "../db";

export async function doc(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        const sql = require('mssql');
        const pool = await getPool();
        context.log('SQL connected successfully');

        let result = await pool.request()
            .input('id', sql.Int, request.params.id)
            .query("select a.user_id, assignment_id, a.title, a.description, a.created_at from assignments a where a.assignment_id = @id");
        const assignment = result.recordset[0];

        result = await pool.request()
            .input('id', sql.Int, request.params.id)
            .query("select * from versions where assignment_id = @id");
        const versions = result.recordset;

        return {
            status: 200,
            body: JSON.stringify({
                document: assignment,
                versions: versions
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

app.http('doc', {
    route: 'meta/doc/{id}',
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: doc
});
