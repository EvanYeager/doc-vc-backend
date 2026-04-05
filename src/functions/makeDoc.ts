import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from "../db";

export async function makeDoc(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        const sql = require('mssql');
        const pool = await getPool();
        context.log('SQL connected successfully');

        const { user_id, title, description } = await request.json();

        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('title', sql.VarChar(255), title)
            .input('description', sql.Text, description)
            .query("insert into assignments (user_id, title, description) output inserted.assignment_id values (@user_id, @title, @description)");
        const assignment_id = result.recordset[0].assignment_id;

        return {
            status: 201,
            body: JSON.stringify({
                assignment_id: assignment_id
            }),
            headers: { 'Content-Type': 'application/json' }
        }
    } catch (err) {
        context.log(`Server failure: ${(err as Error).message}`);
        return {
            status: 500,
            body: JSON.stringify({ error: (err as Error).message }),
            headers: { 'Content-Type': 'application/json' }
        };
    }
};

app.http('makeDoc', {
    route: 'meta/doc',
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: makeDoc
});
