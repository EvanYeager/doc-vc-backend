import jwt from "jsonwebtoken";
import { HttpRequest } from "@azure/functions";

export function getUserFromToken(request: HttpRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.replace("Bearer ", "");

  return jwt.verify(token, process.env.JWT_SECRET as string) as {
    user_id: number;
    username: string;
  };
}
