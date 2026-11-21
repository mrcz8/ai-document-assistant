import { container } from "@/container";
import { handleRoute } from "@/http/handle-route";
import { idSchema } from "@/http/schemas";

export const DELETE = handleRoute(async (_request, context: RouteContext<"/api/documents/[id]">) => {
  const id = idSchema.parse((await context.params).id);
  await container().documents.remove(id);
  return new Response(null, { status: 204 });
});
