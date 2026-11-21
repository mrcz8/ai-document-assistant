import { container } from "@/container";
import { handleRoute, readJson } from "@/http/handle-route";
import { askSchema } from "@/http/schemas";

export const maxDuration = 300;

export const POST = handleRoute(async (request) => {
  const input = askSchema.parse(await readJson(request));
  return Response.json(await container().chat.ask(input));
});
