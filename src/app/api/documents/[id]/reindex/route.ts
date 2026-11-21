import { container } from "@/container";
import { handleRoute } from "@/http/handle-route";
import { idSchema } from "@/http/schemas";

export const maxDuration = 600;

export const POST = handleRoute(async (_request, context: RouteContext<"/api/documents/[id]/reindex">) => {
  const id = idSchema.parse((await context.params).id);
  return Response.json(await container().documents.reindex(id), { status: 202 });
});
