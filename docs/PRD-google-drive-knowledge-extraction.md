# PRD: Care of Chan Knowledge Extraction Pipeline

## 1. Overview

Build a standalone extraction pipeline that ingests historical Google Drive documents from Care of Chan (a luxury event production company) and produces two queryable knowledge stores:

1. **Vector Database** (Qdrant Cloud) — semantic search over document chunks with rich metadata
2. **Knowledge Graph** (Neo4j AuraDB) — entity-relationship graph of institutional knowledge extracted from unstructured text

These stores are then exposed as tools to an LLM agent so we can validate that the AI can answer questions that require tribal/institutional knowledge not available in the company's structured Postgres database.

**This is a proof-of-concept.** The goal is end-to-end validation, not production hardening.

---

## 2. Business Context

### 2.1 What is Care of Chan?

Care of Chan is a luxury event production company. Their core business operations involve:

- **Venues** — researching, evaluating, and booking event spaces (restaurants, galleries, lofts, private dining rooms, theaters, museums, gardens)
- **Vendors** — managing relationships with service providers (florists, caterers, AV companies, lighting designers, photographers, rental companies)
- **Clients** — Fortune 500 and luxury brand clients who hire Care of Chan to produce events
- **Deals** — a sales pipeline from warm lead through proposal, contracting, production, and invoicing
- **Contacts** — people at client organizations, vendor companies, and venues

### 2.2 What exists today

The company has an internal management app ("Care of Chan OS") with:

- **Neon Postgres** database with structured records for venues, vendors, clients, contacts, deals, and their relationships
- **Drizzle ORM** schema defining the data model
- **OpenAI-powered chat agent** with tool-calling access to search and query Postgres (venues, vendors, clients, deals)
- **MCP server** exposing the same data as tools for external AI agents
- **Google OAuth** integration for user authentication

### 2.3 The knowledge gap

The Postgres database captures **structured facts**: venue addresses, vendor service categories, client names, deal statuses, budget ranges.

What it does **not** capture is the **institutional knowledge** accumulated over years of event production — knowledge that currently lives in Google Drive documents:

- "The loading dock at Venue X is terrible — always plan an extra hour for load-in"
- "Client Y hates red flowers and always wants warm lighting"
- "Vendor Z is great for small events but falls apart at scale"
- "The acoustics in Room B at Venue X make speeches inaudible without a mic"
- "We did a rooftop event at Venue X in December and the wind was a disaster — always have an indoor backup"
- "This vendor overcharged us on the last project — check invoices carefully"
- "The in-house catering at Venue X can't handle dietary restrictions well"

This knowledge is what makes a veteran producer valuable. The goal of this PoC is to extract it from documents and make it queryable by an AI agent.

### 2.4 Existing domain entities (from Postgres schema)

These are the canonical entity types the extraction pipeline should attempt to resolve against:

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| **Venue** | name, address, city, state, venueType, neighborhood, spaces[] | Types: restaurant, event_space, gallery, loft, private_dining_room, theater, museum, garden, library, public_property |
| **Vendor** | businessName, locations[], services[], isPreferred | Services are categorized (florals, catering, AV, etc.) |
| **Client** | name, website, industries[] | Typically brands or organizations |
| **Contact** | firstName, lastName, jobTitle, phoneNumbers[], emailAddresses[] | Linked to vendors and/or clients |
| **Deal** | displayName, status, budgetLow, budgetHigh, projectDate, concept, notes | Statuses: Warm Lead → Prospecting → Proposal → Feedback → Contracting → In Progress → Final Invoicing → Complete |
| **Vendor Service** | name | Categories like "Florals", "Catering", "AV", "Lighting", etc. |
| **Amenity** | name, icon | Venue amenities (e.g. "outdoor space", "kitchen", "AV included") |
| **Tag** | name, category | Venue tags in categories: "cuisine" and "style" |

---

## 3. Scope

### 3.1 In scope

1. **Google Drive OAuth + file listing** — authenticate with a Google Workspace account and enumerate files in a target Drive folder (and subfolders)
2. **Document parsing** — extract text from Google Docs, Google Sheets, Google Slides, and PDFs stored in Drive
3. **Chunking** — split parsed documents into semantically meaningful chunks with metadata (source doc, section headers, page/slide number, document type)
4. **Vector embedding + storage** — embed chunks and store in Qdrant Cloud with metadata for filtered retrieval
5. **Entity extraction** — use an LLM to identify mentions of venues, vendors, clients, contacts, events, concepts, and other domain entities from chunks
6. **Entity resolution** — match extracted entity mentions to canonical entities (ideally by fuzzy-matching against names from the Postgres database, or creating new graph nodes for previously unknown entities)
7. **Relationship + knowledge extraction** — use an LLM to extract structured triples (entity-relationship-entity) with context, sentiment, and confidence from chunks
8. **Knowledge graph storage** — store extracted entities and relationships in Neo4j AuraDB
9. **Query interface** — expose both stores (vector search + graph traversal) as callable tools to an LLM agent
10. **Validation harness** — a simple way to pose questions to the agent and evaluate whether it uses institutional knowledge correctly

### 3.2 Out of scope (for PoC)

- Production deployment, auth, rate limiting, monitoring
- Real-time / incremental sync (Drive webhook → re-process changed files)
- Integration with the existing Care of Chan OS app
- Processing of non-document file types (images, videos, audio)
- Processing of Google Forms responses
- Multi-tenant support
- UI for managing or visualizing the pipeline
- Automated evaluation / benchmarking (manual evaluation is fine for PoC)

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INGESTION PIPELINE                          │
│                     (runs as CLI / script)                          │
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐            │
│  │ Google Drive │───▶│  Document   │───▶│   Chunking   │            │
│  │  Connector   │    │   Parser    │    │   Engine     │            │
│  │             │    │             │    │              │            │
│  │ - OAuth2    │    │ - Docs API  │    │ - Section-   │            │
│  │ - List files│    │ - Sheets API│    │   aware      │            │
│  │ - Download  │    │ - Slides API│    │ - Preserve   │            │
│  │ - Metadata  │    │ - PDF parse │    │   structure  │            │
│  └─────────────┘    └─────────────┘    └──────┬───────┘            │
│                                                │                    │
│                          ┌─────────────────────┤                    │
│                          │                     │                    │
│                          ▼                     ▼                    │
│                 ┌─────────────────┐   ┌─────────────────┐          │
│                 │  Vector Store   │   │   Knowledge     │          │
│                 │  Pipeline       │   │   Extraction    │          │
│                 │                 │   │   Pipeline      │          │
│                 │ - Embed chunks  │   │                 │          │
│                 │ - Store in      │   │ - Classify doc  │          │
│                 │   Qdrant        │   │ - Extract       │          │
│                 │ - Metadata      │   │   entities      │          │
│                 │   filters       │   │ - Resolve to    │          │
│                 │                 │   │   canonical IDs │          │
│                 └────────┬────────┘   │ - Extract       │          │
│                          │            │   relationships │          │
│                          │            │ - Store in      │          │
│                          │            │   Neo4j         │          │
│                          │            └────────┬────────┘          │
│                          │                     │                    │
└──────────────────────────┼─────────────────────┼────────────────────┘
                           │                     │
                           ▼                     ▼
                    ┌─────────────┐       ┌─────────────┐
                    │   Qdrant    │       │   Neo4j     │
                    │   Cloud    │       │   AuraDB    │
                    └──────┬──────┘       └──────┬──────┘
                           │                     │
                           ▼                     ▼
                    ┌─────────────────────────────────────┐
                    │          QUERY LAYER                 │
                    │                                      │
                    │  ┌─────────────────────────────┐     │
                    │  │      LLM Agent               │     │
                    │  │   (Claude or OpenAI)          │     │
                    │  │                               │     │
                    │  │  Tools:                       │     │
                    │  │  - vector_search(query, filters)   │
                    │  │  - graph_query(cypher)         │     │
                    │  │  - get_entity(type, id)        │     │
                    │  │  - find_relationships(entity)   │     │
                    │  │  - get_lessons(topic)           │     │
                    │  └─────────────────────────────┘     │
                    │                                      │
                    │  Exposed via:                        │
                    │  - CLI interactive prompt             │
                    │  - Simple HTTP endpoint               │
                    └──────────────────────────────────────┘
```

---

## 5. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Language** | TypeScript (Node.js) | Matches existing Care of Chan app; single language across the org |
| **Runtime** | Node.js 20+ | LTS, native fetch, good async performance |
| **Google Drive** | `googleapis` npm package (Drive v3 API, Docs v1, Sheets v4, Slides v1) | Official Google SDK for Node.js; handles OAuth2, file listing, export |
| **PDF parsing** | `pdf-parse` or `@anthropic-ai/sdk` (PDF support) | For PDFs stored in Drive that aren't native Google Docs |
| **Embedding model** | OpenAI `text-embedding-3-small` (or configurable) | Good quality/cost ratio; the existing app already uses the OpenAI SDK |
| **Vector database** | Qdrant Cloud | Free tier available; excellent filtering, TypeScript client, simple setup |
| **LLM (extraction)** | Claude (Anthropic SDK) or OpenAI GPT-4o | Entity/relationship extraction prompts; Claude preferred for long-context doc processing |
| **Knowledge graph** | Neo4j AuraDB Free | Cypher query language is natural for relationship traversal; free tier is enough for PoC |
| **LLM (agent)** | Claude or OpenAI with tool calling | Whichever model the team prefers; tool-calling is required for graph + vector retrieval |
| **Config** | `.env` + `dotenv` | Simple environment-based config for API keys and connection strings |
| **Build** | `tsx` for dev, `tsup` or `esbuild` for build | Fast TypeScript execution matching existing app setup |
| **Package manager** | `npm` or `pnpm` | Team preference |

---

## 6. Data Models

### 6.1 Vector Store Schema (Qdrant)

**Collection:** `care_of_chan_docs`

```typescript
interface DocumentChunk {
  // Vector
  vector: number[];  // embedding of chunk_text

  // Payload (metadata for filtering)
  payload: {
    chunk_text: string;              // the raw text of this chunk
    source_file_id: string;          // Google Drive file ID
    source_file_name: string;        // human-readable filename
    source_file_type: string;        // "google_doc" | "google_sheet" | "google_slides" | "pdf"
    source_mime_type: string;        // original MIME type
    source_folder_path: string;      // folder hierarchy in Drive
    source_last_modified: string;    // ISO timestamp
    source_created: string;          // ISO timestamp
    source_owner: string;            // Drive file owner email

    chunk_index: number;             // position within document
    chunk_total: number;             // total chunks in this document
    section_heading: string | null;  // nearest heading/slide title
    page_or_slide: number | null;    // page number or slide number

    doc_classification: string;      // "post_mortem" | "production_timeline" | "vendor_proposal" | "client_brief" | "meeting_notes" | "budget" | "mood_board" | "contract" | "correspondence" | "other"

    // Extracted entity mentions (for filtering)
    mentioned_venues: string[];      // venue names found in chunk
    mentioned_vendors: string[];     // vendor names found in chunk
    mentioned_clients: string[];     // client names found in chunk
    mentioned_contacts: string[];    // person names found in chunk

    // Processing metadata
    processed_at: string;            // when this chunk was ingested
    extraction_model: string;        // which LLM did the extraction
    pipeline_version: string;        // for tracking pipeline changes
  };
}
```

### 6.2 Knowledge Graph Schema (Neo4j)

**Node types:**

```cypher
// Core business entities (linked to Postgres IDs when possible)
(:Venue {
  name: String,
  graph_id: String,         // internal graph UUID
  postgres_id: String?,     // FK to Postgres venues.id (null if not matched)
  city: String?,
  state: String?,
  venue_type: String?
})

(:Vendor {
  name: String,
  graph_id: String,
  postgres_id: String?,     // FK to Postgres vendors.id
  services: [String]?
})

(:Client {
  name: String,
  graph_id: String,
  postgres_id: String?,     // FK to Postgres clients.id
})

(:Contact {
  name: String,
  graph_id: String,
  postgres_id: String?,     // FK to Postgres contacts.id
  title: String?,
  org: String?
})

(:Event {
  name: String,
  graph_id: String,
  postgres_id: String?,     // FK to Postgres deals.id
  date: Date?,
  event_type: String?       // "dinner", "product_launch", "gala", "conference", etc.
})

// Knowledge entities (no Postgres equivalent)
(:Concept {
  name: String,             // "rooftop dinner", "farm-to-table", "intimate gathering"
  graph_id: String
})

(:Constraint {
  description: String,      // "noise ordinance after 10pm", "freight elevator unreliable"
  graph_id: String,
  severity: String?         // "minor" | "moderate" | "critical"
})

(:Lesson {
  description: String,      // "always confirm freight elevator 48hrs before"
  graph_id: String
})

(:Preference {
  description: String,      // "prefers warm lighting", "no red flowers"
  graph_id: String,
  category: String?         // "aesthetic" | "operational" | "dietary" | "communication"
})

(:Document {
  name: String,
  drive_file_id: String,
  doc_type: String,
  graph_id: String
})
```

**Relationship types:**

```cypher
// Venue relationships
(Venue)-[:HAS_CONSTRAINT {context, source_doc, confidence}]->(Constraint)
(Venue)-[:BEST_FOR {context, source_doc}]->(Concept)
(Venue)-[:NOT_SUITABLE_FOR {context, source_doc}]->(Concept)
(Venue)-[:LESSON_LEARNED {context, source_doc, date}]->(Lesson)

// Vendor relationships
(Vendor)-[:EXCELS_AT {context, source_doc, sentiment}]->(Concept)
(Vendor)-[:UNRELIABLE_FOR {context, source_doc, sentiment}]->(Concept)
(Vendor)-[:WORKED_WITH {context, source_doc, sentiment, date}]->(Client)
(Vendor)-[:COMPETES_WITH {context}]->(Vendor)

// Client relationships
(Client)-[:PREFERS {context, source_doc}]->(Preference)
(Client)-[:HOSTED_EVENT_AT {context, date}]->(Venue)
(Client)-[:USED_VENDOR {context, sentiment, date}]->(Vendor)

// Contact relationships
(Contact)-[:WORKS_AT]->(Client | Vendor | Venue)
(Contact)-[:DECISION_MAKER_FOR {context}]->(Client)
(Contact)-[:PREFERS {context}]->(Preference)

// Event relationships
(Event)-[:HELD_AT {context}]->(Venue)
(Event)-[:USED_VENDOR {context, sentiment}]->(Vendor)
(Event)-[:FOR_CLIENT]->(Client)
(Event)-[:TAUGHT {context}]->(Lesson)

// Document provenance
(Document)-[:MENTIONS]->(Venue | Vendor | Client | Contact | Event)
(Document)-[:SOURCE_OF]->(Lesson | Constraint | Preference)
```

All relationship edges carry these common properties:
- `context: String` — the relevant sentence/paragraph from the source document
- `source_doc: String` — Drive file ID for provenance
- `confidence: Float` — 0.0-1.0, how confident the LLM was in the extraction
- `extracted_at: DateTime` — when this was extracted

---

## 7. Pipeline Stages (Detailed)

### Stage 1: Google Drive Connector

**Input:** OAuth2 credentials + target folder ID(s)
**Output:** List of file metadata + downloaded content

```typescript
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  folderPath: string;        // reconstructed full path
  createdTime: string;
  modifiedTime: string;
  owners: Array<{ emailAddress: string }>;
  size?: string;
}
```

**Behavior:**
- Recursively list all files in specified folder(s)
- Filter to supported MIME types: `application/vnd.google-apps.document`, `application/vnd.google-apps.spreadsheet`, `application/vnd.google-apps.presentation`, `application/pdf`
- Track processed files by Drive file ID + modifiedTime to enable re-runs without reprocessing unchanged files (store in a local SQLite or JSON manifest)
- Download/export content: Google Docs → plain text or markdown, Google Sheets → structured JSON (rows with headers), Google Slides → per-slide text with slide titles, PDFs → extracted text

### Stage 2: Document Parser

**Input:** Raw file content + metadata
**Output:** Parsed, structured document

```typescript
interface ParsedDocument {
  file: DriveFile;
  content_type: "google_doc" | "google_sheet" | "google_slides" | "pdf";
  sections: Array<{
    heading: string | null;
    body: string;
    page_or_slide: number | null;
    metadata: Record<string, string>;  // e.g., sheet name, column headers
  }>;
  raw_text: string;  // full concatenated text for classification
}
```

**Behavior by file type:**
- **Google Docs:** Use Docs API to get structured content preserving headings, bullet lists, and tables. Convert to sections by heading hierarchy.
- **Google Sheets:** Use Sheets API. Each sheet becomes a section. Preserve column headers. Rows are formatted as `key: value` pairs for each row so the LLM can understand tabular data.
- **Google Slides:** Use Slides API. Each slide becomes a section. Extract text from text boxes and notes. Slide title becomes section heading.
- **PDFs:** Use `pdf-parse` to extract text. Attempt page-level splitting.

### Stage 3: Chunking Engine

**Input:** ParsedDocument
**Output:** Array of chunks with metadata

**Strategy:**
- Chunk by section boundaries first (headings, slide breaks, sheet rows)
- Within sections, chunk at ~800-1200 tokens with ~100 token overlap
- Never split mid-sentence
- Preserve section heading as metadata on every chunk from that section
- For sheets: chunk by row groups (e.g., 10-20 rows per chunk) while always including column headers

### Stage 4: Document Classification

**Input:** First chunk (or first N chunks) of a document + filename
**Output:** Document type classification

**LLM prompt approach:**
```
Given this document from an event production company's Google Drive,
classify it as one of:
- post_mortem: Event debrief or retrospective
- production_timeline: Event planning timeline or schedule
- vendor_proposal: Proposal or quote from a vendor
- client_brief: Client requirements, preferences, or creative brief
- meeting_notes: Notes from internal or client meetings
- budget: Budget spreadsheet or financial document
- mood_board: Visual inspiration or design concepts (text descriptions)
- contract: Agreement or contract terms
- correspondence: Email threads, messages, or communication logs
- venue_research: Venue evaluation, comparison, or scouting notes
- run_of_show: Detailed event day schedule and logistics
- other: Doesn't fit any category

Document filename: {filename}
Document content (first 2000 chars): {content_preview}

Classification:
```

### Stage 5: Vector Embedding + Storage

**Input:** Chunks with metadata
**Output:** Vectors stored in Qdrant

**Behavior:**
- Batch embed chunks using OpenAI `text-embedding-3-small` (or equivalent)
- Upsert to Qdrant with full metadata payload (see 6.1)
- Use file ID + chunk index as point ID for idempotent upserts

### Stage 6: Entity Extraction

**Input:** Individual chunks
**Output:** Structured entity mentions

**LLM prompt approach:**
```
You are analyzing a document from Care of Chan, a luxury event production company.

Extract all entity mentions from the following text. For each entity, provide:
- entity_type: "venue" | "vendor" | "client" | "contact" | "event" | "concept"
- name: the entity name as mentioned in the text
- context: the sentence where it's mentioned
- additional_info: any qualifying information (e.g., job title for contacts, service type for vendors)

Known entities (for matching):
Venues: {list of known venue names from Postgres}
Vendors: {list of known vendor names from Postgres}
Clients: {list of known client names from Postgres}

Text:
{chunk_text}

Extract entities as JSON array:
```

### Stage 7: Entity Resolution

**Input:** Extracted entity mentions + known entities from Postgres
**Output:** Resolved entity IDs (graph_id + postgres_id if matched)

**Approach:**
1. Exact match against known entity names (case-insensitive)
2. Fuzzy match using Levenshtein distance or token overlap (threshold: 0.8 similarity)
3. LLM-assisted disambiguation for ambiguous matches ("The Grand" → which venue?)
4. Create new graph node for unresolved entities (they may be entities not yet in Postgres)
5. Maintain a local resolution cache/map to ensure consistency across chunks

**Entity resolution store:** A simple JSON or SQLite lookup mapping `(entity_type, mention_text) → graph_id` that grows as the pipeline runs.

### Stage 8: Relationship + Knowledge Extraction

**Input:** Chunks with resolved entity mentions
**Output:** Structured triples for the knowledge graph

**LLM prompt approach:**
```
You are extracting institutional knowledge from an event production company's documents.

Given the following text and the entities mentioned in it, extract all relationships,
opinions, lessons, preferences, and constraints expressed.

For each piece of knowledge, output a structured triple:
{
  "subject": { "type": "venue|vendor|client|contact|event", "name": "..." },
  "predicate": "HAS_CONSTRAINT|BEST_FOR|NOT_SUITABLE_FOR|LESSON_LEARNED|EXCELS_AT|UNRELIABLE_FOR|PREFERS|...",
  "object": { "type": "constraint|concept|lesson|preference|venue|vendor|client", "name_or_description": "..." },
  "context": "the original sentence(s) supporting this extraction",
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0-1.0
}

Rules:
- Only extract knowledge that is clearly stated or strongly implied
- Include the supporting context (quote from the text)
- Assign confidence based on how explicit the statement is
- Do NOT hallucinate relationships not supported by the text

Entities found in this chunk:
{resolved_entities_json}

Text:
{chunk_text}

Extracted knowledge (JSON array):
```

### Stage 9: Graph Storage

**Input:** Extracted triples with resolved entity IDs
**Output:** Nodes and edges in Neo4j

**Behavior:**
- MERGE nodes by graph_id (create if not exists, update if exists)
- CREATE relationship edges with all properties (context, source_doc, confidence, sentiment, extracted_at)
- Use parameterized Cypher queries via the `neo4j` JavaScript driver
- Batch operations where possible for performance

### Stage 10: Query Interface

Expose the following tools to the LLM agent:

```typescript
// Vector search: find relevant document chunks
async function vectorSearch(params: {
  query: string;
  filters?: {
    doc_type?: string[];
    mentioned_venues?: string[];
    mentioned_vendors?: string[];
    mentioned_clients?: string[];
  };
  limit?: number;
}): Promise<Array<{ text: string; score: number; metadata: ChunkMetadata }>>

// Graph: get everything known about an entity
async function getEntityKnowledge(params: {
  entity_type: "venue" | "vendor" | "client" | "contact";
  entity_name: string;
}): Promise<{
  entity: GraphNode;
  relationships: Array<{ type: string; target: GraphNode; context: string; sentiment: string }>;
}>

// Graph: find entities matching criteria
async function findEntities(params: {
  entity_type: string;
  filters?: Record<string, string>;  // property filters
}): Promise<GraphNode[]>

// Graph: traverse relationships
async function findRelationships(params: {
  from_entity?: { type: string; name: string };
  relationship_type?: string;
  to_entity_type?: string;
  sentiment?: string;
}): Promise<Array<{ from: GraphNode; relationship: string; to: GraphNode; context: string }>>

// Graph: get lessons for a topic or entity
async function getLessons(params: {
  topic?: string;        // e.g., "rooftop events", "load-in logistics"
  entity_name?: string;  // e.g., specific venue name
}): Promise<Array<{ lesson: string; context: string; source: string }>>
```

---

## 8. Project Structure (New Repo)

```
care-of-chan-knowledge/
├── src/
│   ├── config/
│   │   └── index.ts              # env vars, constants, known entities list
│   ├── drive/
│   │   ├── auth.ts               # Google OAuth2 setup
│   │   ├── connector.ts          # List + download Drive files
│   │   └── types.ts
│   ├── parser/
│   │   ├── docs.ts               # Google Docs parser
│   │   ├── sheets.ts             # Google Sheets parser
│   │   ├── slides.ts             # Google Slides parser
│   │   ├── pdf.ts                # PDF parser
│   │   └── types.ts
│   ├── chunking/
│   │   └── index.ts              # Section-aware chunking engine
│   ├── classification/
│   │   └── index.ts              # LLM-based doc classification
│   ├── embedding/
│   │   └── index.ts              # Batch embedding + Qdrant upsert
│   ├── extraction/
│   │   ├── entities.ts           # Entity extraction from chunks
│   │   ├── resolution.ts         # Entity resolution / fuzzy matching
│   │   ├── relationships.ts      # Relationship + knowledge extraction
│   │   └── prompts.ts            # All LLM prompt templates
│   ├── stores/
│   │   ├── qdrant.ts             # Qdrant client + operations
│   │   ├── neo4j.ts              # Neo4j client + operations
│   │   └── manifest.ts           # Local processing manifest (SQLite or JSON)
│   ├── agent/
│   │   ├── tools.ts              # Tool definitions for the LLM agent
│   │   ├── agent.ts              # Agent loop with tool calling
│   │   └── prompts.ts            # Agent system prompt
│   ├── pipeline/
│   │   └── index.ts              # Orchestrates full pipeline: drive → parse → chunk → embed → extract → store
│   └── index.ts                  # CLI entry point
├── scripts/
│   ├── export-known-entities.ts  # Export venue/vendor/client names from Postgres for entity resolution
│   └── validate.ts               # Run sample questions against the agent
├── data/
│   ├── known-entities.json       # Exported from Postgres (venue names, vendor names, client names)
│   └── manifest.json             # Processing state (which files have been processed)
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 9. Configuration / Environment Variables

```bash
# Google Drive
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback
GOOGLE_DRIVE_FOLDER_IDS=comma,separated,folder,ids

# LLM (for extraction + agent)
ANTHROPIC_API_KEY=         # if using Claude for extraction
OPENAI_API_KEY=            # if using OpenAI for extraction and/or embedding

# Vector Store
QDRANT_URL=                # Qdrant Cloud endpoint
QDRANT_API_KEY=
QDRANT_COLLECTION=care_of_chan_docs

# Knowledge Graph
NEO4J_URI=                 # neo4j+s://xxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=

# Embedding
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Processing
EXTRACTION_MODEL=claude-sonnet-4-5-20250929   # or gpt-4o
EXTRACTION_BATCH_SIZE=10                      # chunks per extraction batch
MAX_CONCURRENT_EXTRACTIONS=3                  # parallel LLM calls
```

---

## 10. Success Criteria

The PoC is successful if the agent can answer questions like these **using knowledge extracted from Drive documents, not from its training data or the Postgres database**:

| Question | Expected Source |
|----------|----------------|
| "What should I know about producing an event at [Venue X]?" | Graph: venue constraints, lessons, preferences |
| "Which vendors are best for large-scale floral installations?" | Graph: vendor EXCELS_AT relationships with positive sentiment |
| "What does [Client Y] care about aesthetically?" | Graph: client preferences |
| "We had a bad experience with [Vendor Z] — what happened?" | Graph: negative sentiment relationships + Vector: source document context |
| "What lessons have we learned about rooftop events?" | Graph: lessons linked to rooftop concept/venues |
| "Who is the best contact at [Client Y] for approvals?" | Graph: contact DECISION_MAKER_FOR relationships |
| "Compare Vendor A vs Vendor B for catering" | Graph: both vendors' relationships, sentiments, and contexts |

**Evaluation method:** Manually run 15-20 questions, review the agent's answers and the tool calls it makes, verify that it's retrieving real extracted knowledge rather than hallucinating.

---

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Extraction quality** — LLM produces low-quality or hallucinated triples | Knowledge graph is unreliable | Manual review of extraction sample; confidence thresholds; always store source context for verification |
| **Entity resolution failures** — "The Grand" doesn't match "The Grand Ballroom" | Duplicate nodes, fragmented knowledge | Fuzzy matching + LLM-assisted disambiguation; resolution cache; manual correction tool |
| **Google Drive API rate limits** | Pipeline stalls | Batch requests; exponential backoff; process files sequentially with state tracking |
| **Document variety** — wildly different document formats and structures | Parser fails or produces garbage | Start with a curated sample of well-structured docs; extend parsers incrementally |
| **Cost** — LLM calls for extraction on many documents | PoC budget overrun | Process a representative subset (20-50 docs); use cheaper models for classification/entity extraction, expensive models only for relationship extraction |
| **Stale knowledge** — extracted knowledge becomes outdated | Agent gives bad advice | Out of scope for PoC; future work would add timestamp-based relevance decay |

---

## 12. PoC Milestones

| Milestone | Description | Deliverable |
|-----------|-------------|-------------|
| **M1: Skeleton** | Project setup, Google OAuth flow working, can list Drive files | CLI that authenticates and prints file list |
| **M2: Parse + Chunk** | Parse all 4 doc types, chunking works | CLI that outputs chunks for a given folder |
| **M3: Vector Store** | Embeddings generated and stored in Qdrant, basic search works | CLI `search "query"` returns relevant chunks |
| **M4: Entity Extraction** | Entity extraction + resolution working on sample docs | JSON output of extracted entities matched to known entities |
| **M5: Knowledge Graph** | Relationship extraction working, graph populated in Neo4j | Cypher queries return meaningful results |
| **M6: Agent** | LLM agent with vector + graph tools answers questions | Interactive CLI where you ask questions and the agent uses both stores |
| **M7: Validation** | Run test questions, evaluate quality, document results | Evaluation report with question/answer pairs and quality assessment |

---

## 13. Open Questions

See follow-up questions below.

---
