import { config } from "@/config/env";
import { OllamaClient } from "@/infrastructure/ai/ollama-client";
import { Database } from "@/infrastructure/database/database";
import { LocalFileStorage } from "@/infrastructure/storage/local-file-storage";
import { AfterResponseScheduler } from "@/infrastructure/tasks/after-response-scheduler";
import { RecursiveTextChunker } from "@/ingestion/chunking/recursive-text-chunker";
import { ParserFactory } from "@/ingestion/parsers/parser-factory";
import { ChatRepository } from "@/repositories/chat-repository";
import { ChunkRepository } from "@/repositories/chunk-repository";
import { CollectionRepository } from "@/repositories/collection-repository";
import { DocumentRepository } from "@/repositories/document-repository";
import { ChatService } from "@/services/chat-service";
import { CollectionService } from "@/services/collection-service";
import { DocumentService } from "@/services/document-service";
import { IngestionService } from "@/services/ingestion-service";

export interface Container {
  collections: CollectionService;
  documents: DocumentService;
  chat: ChatService;
}

function build(): Container {
  const env = config();
  const db = Database.getInstance();

  const ollama = new OllamaClient({
    baseUrl: env.OLLAMA_BASE_URL,
    chatModel: env.OLLAMA_CHAT_MODEL,
    embedModel: env.OLLAMA_EMBED_MODEL,
  });
  const storage = new LocalFileStorage(env.STORAGE_DIR);
  const parsers = new ParserFactory();
  const chunker = new RecursiveTextChunker(env.CHUNK_SIZE, env.CHUNK_OVERLAP);

  const collectionRepository = new CollectionRepository(db);
  const documentRepository = new DocumentRepository(db);
  const chunkRepository = new ChunkRepository(db);
  const chatRepository = new ChatRepository(db);

  const collections = new CollectionService(collectionRepository, documentRepository, storage);
  const ingestion = new IngestionService(storage, parsers, chunker, ollama, documentRepository, chunkRepository);
  const documents = new DocumentService(
    documentRepository,
    collections,
    storage,
    parsers,
    ingestion,
    new AfterResponseScheduler(),
  );
  const chat = new ChatService(collections, chunkRepository, chatRepository, ollama, ollama, {
    topK: env.RETRIEVAL_TOP_K,
    minSimilarity: env.RETRIEVAL_MIN_SIMILARITY,
  });

  return { collections, documents, chat };
}

let instance: Container | undefined;

export function container(): Container {
  instance ??= build();
  return instance;
}
