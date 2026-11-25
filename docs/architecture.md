# AI Document Assistant Architecture

Diagrams of how the AI Document Assistant is put together and how data moves through it.

1. [System overview](#1-system-overview)
2. [Ingest flow](#2-ingest-flow)
3. [Chat flow](#3-chat-flow)
4. [Code layers](#4-code-layers)
5. [Database schema](#5-database-schema)
6. [Document lifecycle](#6-document-lifecycle)

---

## 1. System overview

What runs where. `docker compose up -d` starts the two containers; Ollama runs on the host so it can use the GPU.

```mermaid
flowchart LR
    User([Browser])

    subgraph Docker [Docker Compose]
        subgraph App [docmind-app : Next.js]
            UI[React UI]
            API[API Route Handlers]
            SVC[Services]
        end
        DB[(docmind-postgres<br/>PostgreSQL 17 + pgvector)]
        VOL[[uploads volume]]
    end

    subgraph Host [Host machine]
        OL[Ollama]
        EMB[nomic-embed-text]
        LLM[qwen2.5:7b]
    end

    User -->|http://localhost:3000| UI
    UI -->|fetch /api/*| API
    API --> SVC
    SVC <-->|SQL + vectors| DB
    SVC <-->|original files| VOL
    SVC -->|host.docker.internal:11434| OL
    OL --- EMB
    OL --- LLM
```

---

## 2. Ingest flow

What happens after a file is uploaded. The upload returns right away; indexing runs in the background and the UI polls for the status.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant UI as React UI
    participant API as POST /api/collections/:id/documents
    participant DS as DocumentService
    participant FS as LocalFileStorage
    participant IS as IngestionService
    participant PF as ParserFactory
    participant CH as RecursiveTextChunker
    participant OL as Ollama (nomic-embed-text)
    participant DB as PostgreSQL + pgvector

    U->>UI: Drop PDF / DOCX / TXT / MD
    UI->>API: multipart upload (files)
    API->>DS: upload(collectionId, files)
    DS->>DS: validate type and size
    DS->>FS: save file
    DS->>DB: INSERT document (status = processing)
    DS-->>API: documents
    API-->>UI: 202 Accepted

    Note over DS,IS: after() runs once the response is sent

    DS->>IS: ingest(document)
    IS->>FS: read file
    IS->>PF: create(fileName, mimeType)
    PF-->>IS: PdfParser / DocxParser / PlainTextParser
    IS->>IS: parse into pages
    IS->>CH: split(pages)
    CH-->>IS: chunks with page numbers
    IS->>OL: embed chunks (batches of 16)
    OL-->>IS: 768-dim vectors
    IS->>DB: replace chunks + vectors
    IS->>DB: UPDATE document (status = ready)

    loop every 2s while processing
        UI->>API: GET documents
        API-->>UI: status
    end
```

---

## 3. Chat flow

How a question becomes a cited answer.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant UI as React UI
    participant API as POST /api/chat
    participant CS as ChatService
    participant OL as Ollama
    participant DB as PostgreSQL + pgvector
    participant PB as PromptBuilder

    U->>UI: Ask a question
    UI->>API: { collectionId, sessionId, question }
    API->>CS: ask(input)
    CS->>DB: recent chat history (last 6)
    CS->>OL: embed previous question + question
    OL-->>CS: query vector
    CS->>DB: top 5 chunks by cosine similarity in this collection
    DB-->>CS: chunks + similarity
    CS->>CS: drop chunks below 0.45

    alt no relevant chunks
        CS-->>API: "I don't know" (no LLM call)
    else relevant chunks found
        CS->>PB: history + excerpts + question
        PB-->>CS: system rules + numbered excerpts
        CS->>OL: chat (qwen2.5:7b)
        OL-->>CS: answer with [n] citations
        CS->>CS: keep only cited sources
    end

    CS->>DB: save user + assistant messages
    CS-->>API: answer + sources
    API-->>UI: JSON
    UI-->>U: Answer with expandable sources (file, page)
```

---

## 4. Code layers

Dependencies point inward. Services depend on interfaces in `domain/ports.ts`, and `container.ts` wires in the real implementations.

```mermaid
flowchart TB
    subgraph HTTP [HTTP layer]
        R[src/app/api/*<br/>Route Handlers]
        H[src/http<br/>handleRoute + Zod schemas]
    end

    subgraph Composition
        C[src/container.ts<br/>Dependency injection root]
    end

    subgraph Services [src/services]
        CS[ChatService]
        DS[DocumentService]
        IS[IngestionService]
        COL[CollectionService]
        PB[PromptBuilder<br/>Builder]
    end

    subgraph Domain [src/domain]
        M[models.ts]
        P[ports.ts<br/>interfaces]
        E[errors.ts]
    end

    subgraph Repos [src/repositories · Repository]
        CR[CollectionRepository]
        DR[DocumentRepository]
        KR[ChunkRepository]
        HR[ChatRepository]
    end

    subgraph Ingestion [src/ingestion]
        PF[ParserFactory<br/>Factory]
        PS[PdfParser · DocxParser · PlainTextParser<br/>Strategy]
        TC[RecursiveTextChunker]
    end

    subgraph Infra [src/infrastructure]
        DB[Database<br/>Singleton]
        OC[OllamaClient<br/>Adapter]
        FS[LocalFileStorage]
        TS[AfterResponseScheduler]
    end

    R --> H
    R --> C
    C --> Services
    CS --> PB
    Services --> P
    Services --> Repos
    IS --> PF
    PF --> PS
    IS --> TC
    Repos --> DB
    OC -.implements.-> P
    FS -.implements.-> P
    TS -.implements.-> P
    PS -.implements.-> P
    TC -.implements.-> P
```

| Pattern | Where | Why |
|---|---|---|
| Strategy | `PdfParser`, `DocxParser`, `PlainTextParser` | Each file type has its own parser behind one interface |
| Factory | `ParserFactory` | Picks the right parser from the file name and MIME type |
| Repository | `src/repositories/*` | Keeps SQL out of the services |
| Singleton | `Database` | One shared connection pool |
| Adapter | `OllamaClient` | Wraps the Ollama HTTP API behind `EmbeddingProvider` and `ChatModel` |
| Builder | `PromptBuilder` | Assembles system rules, history, excerpts, and the question step by step |
| Dependency Injection | `container.ts` | Swap Ollama, storage, or the DB without touching services |

---

## 5. Database schema

```mermaid
erDiagram
    collections ||--o{ documents : contains
    collections ||--o{ chunks : scopes
    collections ||--o{ chat_messages : scopes
    documents ||--o{ chunks : "split into"

    collections {
        uuid id PK
        text name UK
        timestamptz created_at
    }

    documents {
        uuid id PK
        uuid collection_id FK
        text file_name
        text mime_type
        text storage_path
        bigint size_bytes
        text status "processing | ready | failed"
        text error
        int page_count
        int chunk_count
        timestamptz uploaded_at
        timestamptz indexed_at
    }

    chunks {
        bigserial id PK
        uuid document_id FK
        uuid collection_id FK
        int chunk_index
        int page
        text content
        vector embedding "768 dims, HNSW cosine index"
    }

    chat_messages {
        bigserial id PK
        uuid session_id
        uuid collection_id FK
        text role "user | assistant"
        text content
        jsonb sources
        timestamptz created_at
    }
```

Deleting a collection removes its documents, chunks, and chat messages (`ON DELETE CASCADE`).

---

## 6. Document lifecycle

```mermaid
stateDiagram-v2
    [*] --> processing: upload
    processing --> ready: parsed, chunked, embedded
    processing --> failed: no text / Ollama error
    ready --> processing: re-index
    failed --> processing: re-index
    ready --> [*]: delete
    failed --> [*]: delete
```
