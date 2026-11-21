import { container } from "@/container";
import { handleRoute } from "@/http/handle-route";
import { idSchema } from "@/http/schemas";

export const GET = handleRoute(async (_request, context: RouteContext<"/api/chat/[sessionId]">) => {
  const sessionId = idSchema.parse((await context.params).sessionId);
  return Response.json(await container().chat.history(sessionId));
});

export const DELETE = handleRoute(async (_request, context: RouteContext<"/api/chat/[sessionId]">) => {
  const sessionId = idSchema.parse((await context.params).sessionId);
  await container().chat.clear(sessionId);
  return new Response(null, { status: 204 });
});
