import { ValidationError } from "@/domain/errors";
import type { ChatAnswer, ChatMessage, RetrievedChunk, Source } from "@/domain/models";
import type { ChatModel, EmbeddingProvider } from "@/domain/ports";
import type { ChatRepository } from "@/repositories/chat-repository";
import type { ChunkRepository } from "@/repositories/chunk-repository";
import type { CollectionService } from "./collection-service";
import { NOT_FOUND_ANSWER, PromptBuilder } from "./prompt-builder";

const HISTORY_LIMIT = 6;
const EXCERPT_LENGTH = 280;
const MAX_QUESTION_LENGTH = 2000;

export interface RetrievalSettings {
  topK: number;
  minSimilarity: number;
}

export interface AskInput {
  collectionId: string;
  sessionId: string;
  question: string;
}

export class ChatService {
  constructor(
    private readonly collections: CollectionService,
    private readonly chunks: ChunkRepository,
    private readonly messages: ChatRepository,
    private readonly embeddings: EmbeddingProvider,
    private readonly model: ChatModel,
    private readonly retrieval: RetrievalSettings,
  ) {}

  history(sessionId: string): Promise<ChatMessage[]> {
    return this.messages.findBySession(sessionId);
  }

  clear(sessionId: string): Promise<void> {
    return this.messages.deleteSession(sessionId);
  }

  async ask(input: AskInput): Promise<ChatAnswer> {
    const question = input.question.trim();
    if (!question) throw new ValidationError("Question is required");
    if (question.length > MAX_QUESTION_LENGTH) {
      throw new ValidationError(`Question must be at most ${MAX_QUESTION_LENGTH} characters`);
    }
    await this.collections.get(input.collectionId);

    const history = await this.messages.findRecent(input.sessionId, HISTORY_LIMIT);
    const retrieved = await this.retrieve(input.collectionId, retrievalQuery(question, history));
    const answer = retrieved.length > 0
      ? await this.generate(question, history, retrieved)
      : { answer: NOT_FOUND_ANSWER, sources: [], grounded: false };

    await this.messages.append({ ...input, role: "user", content: question });
    await this.messages.append({ ...input, role: "assistant", content: answer.answer, sources: answer.sources });
    return answer;
  }

  private async retrieve(collectionId: string, question: string): Promise<RetrievedChunk[]> {
    const embedding = await this.embeddings.embedQuery(question);
    const candidates = await this.chunks.searchSimilar({ collectionId, embedding, limit: this.retrieval.topK });
    return candidates.filter((chunk) => chunk.similarity >= this.retrieval.minSimilarity);
  }

  private async generate(question: string, history: ChatMessage[], retrieved: RetrievedChunk[]): Promise<ChatAnswer> {
    const turns = new PromptBuilder().withHistory(history).withContext(retrieved).withQuestion(question).build();
    const answer = await this.model.complete(turns);

    if (answer.includes(NOT_FOUND_ANSWER)) {
      return { answer: NOT_FOUND_ANSWER, sources: [], grounded: false };
    }

    const sources = retrieved.map((chunk, position) => toSource(chunk, position + 1));
    const cited = citedIndexes(answer);
    const usedSources = cited.size > 0 ? sources.filter((source) => cited.has(source.index)) : sources;
    return { answer, sources: usedSources, grounded: true };
  }
}

function retrievalQuery(question: string, history: ChatMessage[]): string {
  const previous = history.findLast((message) => message.role === "user");
  return previous ? `${previous.content}\n${question}` : question;
}

function citedIndexes(answer: string): Set<number> {
  return new Set([...answer.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])));
}

function toSource(chunk: RetrievedChunk, index: number): Source {
  const excerpt = chunk.content.length > EXCERPT_LENGTH
    ? `${chunk.content.slice(0, EXCERPT_LENGTH).trimEnd()}…`
    : chunk.content;

  return {
    index,
    documentId: chunk.documentId,
    fileName: chunk.fileName,
    page: chunk.page,
    excerpt,
    similarity: Math.round(chunk.similarity * 1000) / 1000,
  };
}
