export abstract class AppError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;

  constructor(entity: string, id: string) {
    super(`${entity} '${id}' was not found`);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
}

export class UnsupportedFileError extends AppError {
  readonly statusCode = 415;

  constructor(fileName: string) {
    super(`'${fileName}' is not a supported file type. Use PDF, DOCX, TXT, or Markdown.`);
  }
}

export class UpstreamServiceError extends AppError {
  readonly statusCode = 502;
}
