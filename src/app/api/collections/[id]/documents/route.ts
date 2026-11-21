import { container } from "@/container";
import { handleRoute } from "@/http/handle-route";
import { idSchema } from "@/http/schemas";

export const maxDuration = 600;

export const GET = handleRoute(async (_request, context: RouteContext<"/api/collections/[id]/documents">) => {
  const id = idSchema.parse((await context.params).id);
  return Response.json(await container().documents.list(id));
});

export const POST = handleRoute(async (request, context: RouteContext<"/api/collections/[id]/documents">) => {
  const id = idSchema.parse((await context.params).id);
  const form = await request.formData();
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  return Response.json(await container().documents.upload(id, files), { status: 202 });
});
