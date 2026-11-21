import { z } from "zod";

export const idSchema = z.uuid();

export const createCollectionSchema = z.object({
  name: z.string(),
});

export const askSchema = z.object({
  collectionId: z.uuid(),
  sessionId: z.uuid(),
  question: z.string(),
});
