import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getPool } from "../db";
import jwt from "jsonwebtoken";

// import bcrypt from 'bcrypt';

export async function login(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    const body = (await request.json()) as {
      username: string;
      password: string;
    };
    const { username, password } = body;

    // 400: invalid body
    if (!username || !password) {
      return {
        status: 400,
        jsonBody: { error: "username and password are required." },
      };
    }

    // find user by username
    const sql = require("mssql");
    const pool = await getPool();
    context.log("SQL connected successfully");
    const result = await pool
      .request()
      .input("username", sql.VarChar(255), username)
      .query("SELECT * FROM Users WHERE username = @username");

    if (!result.recordset[0]) {
      return {
        status: 401,
        jsonBody: { error: "Invalid username or password." },
      };
    }

    const user = result.recordset[0];

    // const passwordMatch = await bcrypt.compare(password, user.password_hash);
    const passwordMatch = password === user.password_hash; // TODO: replace with bcrypt in production

    if (!passwordMatch) {
      return {
        status: 401,
        jsonBody: { error: "Invalid username or password." },
      };
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" },
    );

    return {
      status: 200,
      jsonBody: {
        message: "Login successful",
        token: token,
        user_id: user.user_id,
      },
    };
  } catch (err) {
    context.log("Login error: " + (err as Error).message);
    return {
      status: 500,
      jsonBody: { error: (err as Error).message },
    };
  }
}

export async function register(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const SALT_ROUNDS = 10;
  try {
    const body = (await request.json()) as {
      username: string;
      password: string;
      email: string;
    };
    const { username, password, email } = body;

    // validate input
    if (!username || !password || !email) {
      return {
        status: 400,
        jsonBody: { error: "username, password, and email are required." },
      };
    }

    const sql = require("mssql");
    const pool = await getPool();
    context.log("SQL connected successfully");

    // check if username already exists
    const existingUser = await pool
      .request()
      .input("username", sql.VarChar(255), username)
      .query("SELECT * FROM Users WHERE username = @username");

    if (existingUser.recordset[0]) {
      return {
        status: 409,
        jsonBody: { error: "Username already exists." },
      };
    }

    // const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const password_hash = password; // TODO: replace with bcrypt in production

    const result = await pool
      .request()
      .input("username", sql.VarChar(255), username)
      .input("password_hash", sql.VarChar(255), password_hash)
      .input("email", sql.VarChar(255), email)
      .query(
        "INSERT INTO Users (username, password_hash, email) OUTPUT inserted.user_id VALUES (@username, @password_hash, @email)",
      );

    return {
      status: 201,
      body: JSON.stringify({
        message: "User registered successfully",
        user: {
          id: result.recordset[0].user_id,
          username: username,
          email: email,
        },
      }),
    };
  } catch (err) {
    context.log("Registration error: " + (err as Error).message);
    return {
      status: 500,
      jsonBody: { error: (err as Error).message },
    };
  }
}

app.http("login", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: login,
});

app.http("register", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: register,
});
