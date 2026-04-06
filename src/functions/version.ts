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

export async function makeVersion(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        const sql = require('mssql');
        const pool = await getPool();
        context.log('SQL connected successfully');

        const { user_id, file_path } = await request.json() as {
            user_id: number;
            file_path: string;
        };
        const assignment_id = parseInt(request.params.id);

        // get version number by counting existing versions for this assignment
        const versionResult = await pool.request()
            .input('assignment_id', sql.Int, assignment_id)
            .query("select count(*) as version_count from versions where assignment_id = @assignment_id");
        const newVersionNum = versionResult.recordset[0].version_count + 1;


        const result = await pool.request()
            .input('assignment_id', sql.Int, assignment_id)
            .input('version_number', sql.Int, newVersionNum)
            .input('file_path', sql.VarChar(255), file_path)
            .query("insert into versions (assignment_id, version_number, file_path) output inserted.version_number values (@assignment_id, @version_number, @file_path)");
        const version_number = result.recordset[0].version_number;

        return {
            status: 201,
            body: JSON.stringify({
                version_number: version_number
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
}

app.http('version', {
    route: 'meta/doc/{id}/{version}',
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: version
});

app.http('makeVersion', {
    route: 'meta/doc/{id}',
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: makeVersion
})