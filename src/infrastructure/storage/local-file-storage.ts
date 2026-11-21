import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileStorage } from "@/domain/ports";

export class LocalFileStorage implements FileStorage {
  private readonly root: string;

  constructor(directory: string) {
    this.root = path.resolve(directory);
  }

  async save(fileName: string, buffer: Buffer): Promise<string> {
    await mkdir(this.root, { recursive: true });
    const storedName = `${randomUUID()}${path.extname(fileName).toLowerCase()}`;
    await writeFile(path.join(this.root, storedName), buffer);
    return storedName;
  }

  async read(storagePath: string): Promise<Buffer> {
    return readFile(this.resolve(storagePath));
  }

  async remove(storagePath: string): Promise<void> {
    await rm(this.resolve(storagePath), { force: true });
  }

  private resolve(storagePath: string): string {
    return path.join(this.root, path.basename(storagePath));
  }
}
