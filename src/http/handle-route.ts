import { connection } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/domain/errors";

type Handler<TContext> = (request: Request, context: TContext) => Promise<Response>;

export function handleRoute<TContext>(handler: Handler<TContext>): Handler<TContext> {
  return async (request, context) => {
    await connection();
    try {
      return await handler(request, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

function toErrorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json({ error: error.message }, { status: error.statusCode });
  }
  if (error instanceof ZodError) {
    const message = error.issues
      .map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
      .join("; ");
    return Response.json({ error: message }, { status: 400 });
  }
  console.error(error);
  return Response.json({ error: "Something went wrong. Check the server logs." }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
