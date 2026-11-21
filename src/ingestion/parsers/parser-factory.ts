import { UnsupportedFileError } from "@/domain/errors";
import type { DocumentParser } from "@/domain/ports";
import { DocxParser } from "./docx-parser";
import { PdfParser } from "./pdf-parser";
import { PlainTextParser } from "./plain-text-parser";

export class ParserFactory {
  constructor(
    private readonly parsers: DocumentParser[] = [new PdfParser(), new DocxParser(), new PlainTextParser()],
  ) {}

  isSupported(fileName: string, mimeType: string): boolean {
    return this.parsers.some((parser) => parser.supports(fileName, mimeType));
  }

  create(fileName: string, mimeType: string): DocumentParser {
    const parser = this.parsers.find((candidate) => candidate.supports(fileName, mimeType));
    if (!parser) {
      throw new UnsupportedFileError(fileName);
    }
    return parser;
  }
}
