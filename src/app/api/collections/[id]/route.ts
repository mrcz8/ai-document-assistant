import { container } from "@/container";
import { handleRoute } from "@/http/handle-route";
import { idSchema } from "@/http/schemas";

export const DELETE = handleRoute(async (_request, context: RouteContext<"/api/collections/[id]">) => {
  const id = idSchema.parse((await context.params).id);
  await container().collections.remove(id);
  return new Response(null, { status: 204 });
});
