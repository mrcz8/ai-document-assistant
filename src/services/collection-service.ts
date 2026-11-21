import { ConflictError, NotFoundError, ValidationError } from "@/domain/errors";
import type { Collection } from "@/domain/models";
import type { FileStorage } from "@/domain/ports";
import type { CollectionRepository } from "@/repositories/collection-repository";
import type { DocumentRepository } from "@/repositories/document-repository";

const MAX_NAME_LENGTH = 60;

export class CollectionService {
  constructor(
    private readonly collections: CollectionRepository,
    private readonly documents: DocumentRepository,
    private readonly storage: FileStorage,
  ) {}

  list(): Promise<Collection[]> {
    return this.collections.findAll();
  }

  async get(id: string): Promise<Collection> {
    const collection = await this.collections.findById(id);
    if (!collection) throw new NotFoundError("Collection", id);
    return collection;
  }

  async create(rawName: string): Promise<Collection> {
    const name = rawName.trim();
    if (!name) throw new ValidationError("Collection name is required");
    if (name.length > MAX_NAME_LENGTH) {
      throw new ValidationError(`Collection name must be at most ${MAX_NAME_LENGTH} characters`);
    }
    if (await this.collections.findByName(name)) {
      throw new ConflictError(`A collection named '${name}' already exists`);
    }
    return this.collections.create(name);
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    const storagePaths = await this.documents.findStoragePathsByCollection(id);
    await this.collections.delete(id);
    await Promise.all(storagePaths.map((storagePath) => this.storage.remove(storagePath)));
  }
}
