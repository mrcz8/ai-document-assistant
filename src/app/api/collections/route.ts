import { container } from "@/container";
import { handleRoute, readJson } from "@/http/handle-route";
import { createCollectionSchema } from "@/http/schemas";

export const GET = handleRoute(async () => {
  return Response.json(await container().collections.list());
});

export const POST = handleRoute(async (request) => {
  const { name } = createCollectionSchema.parse(await readJson(request));
  return Response.json(await container().collections.create(name), { status: 201 });
});
