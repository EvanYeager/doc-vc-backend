import { sql } from "mssql";

let pool: sql.sqlConnectionPool | null = null;


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

export async function getPool(): Promise<sql.ConnectionPool> {
    if (!pool || !pool.connected) {
        pool = await sql.connect(config);
        
    }
    return pool;
}