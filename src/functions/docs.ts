import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function docs(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const username = request.query.get("username") || "";

    const sql = require('mssql');
    const config = {
        user: 'sa',
        password: 'YourPassword123!',
        server: 'localhost',
        port: 1433,
        database: 'master',
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };

    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('username', sql.VarChar(50), username)
            .query("select a.user_id, assignment_id, a.title, a.description, a.created_at from assignments a, users b where a.user_id = b.user_id and b.username = @username");
        const rows = result.recordset;

        context.log('SQL connected successfully');

        return {
            status: 200,
            body: JSON.stringify({
                message: `Hello, ${username}!`,
                result: rows
            }),
            headers: { 'Content-Type': 'application/json' }
        };
    } catch (err) {
        context.log(`SQL connection failed: ${(err as Error).message}`);
        return {
            status: 500,
            body: JSON.stringify({ error: err.message }),
            headers: { 'Content-Type': 'application/json' }
        };
    }
};

app.http('docs', {
    route: 'meta/docs',
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: docs
});
