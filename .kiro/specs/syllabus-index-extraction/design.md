# Design Document

## Overview

This design implements a clean syllabus display system by extracting structured module and topic information from PDF index/table of contents pages. The system separates the presentation layer (clean syllabus structure) from the content layer (full text for AI features), ensuring users see professional course organization while maintaining rich content for quizzes and chatbot functionality.

## Architecture

### High-Level Architecture

```
PDF Files
    ↓
Index Extractor → Syllabus Structure DB (module_syllabus table)
    ↓                                              ↓
Content Processor → Content Store (knowledge_chunks)    → Syllabus API → UI Display
                           ↓
                    Quiz Generator / Chatbot
```

### Component Separation

1. **Index Extraction Pipeline**: Identifies and parses index pages to extract module/topic structure
2. **Content Processing Pipeline**: Existing system that extracts full content for AI features
3. **Syllabus Storage**: New database table for clean structure data
4. **Content Storage**: Existing knowledge_chunks table (unchanged)
5. **Syllabus API**: Enhanced to prioritize structure data over chunk data for display

## Components and Interfaces

### 1. IndexExtractor Class

**Purpose**: Extract structured syllabus information from PDF index pages

**Interface**:
```typescript
class IndexExtractor {
  // Detect if a page is an index/TOC page
  isIndexPage(pageText: string, pageNumber: number): boolean
  
  // Extract all index entries from a page
  extractIndexEntries(pageText: string): IndexEntry[]
  
  // Parse a single index line into structured data
  parseIndexLine(line: string): IndexEntry | null
  
  // Clean formatting artifacts from topic names
  cleanTopicName(rawName: string): string
  
  // Build hierarchical structure from flat entries
  buildModuleStructure(entries: IndexEntry[]): ModuleStructure[]
}

interface IndexEntry {
  text: string
  level: number  // 0 = module, 1 = topic, 2 = subtopic
  pageNumber?: number
  isModuleHeader: boolean
}

interface ModuleStructure {
  moduleName: string
  moduleNumber?: number
  topics: string[]
}
```

**Key Methods**:

- `isIndexPage()`: Detects index pages by looking for keywords like "Contents", "Index", "Table of Contents" and checking if the page contains page number patterns
- `extractIndexEntries()`: Splits page text into lines and parses each line for index entries
- `parseIndexLine()`: Uses regex to extract topic name, indentation level, and page number
- `cleanTopicName()`: Removes dots, dashes, page numbers, QR code references, and extra whitespace
- `buildModuleStructure()`: Groups topics under their parent modules based on hierarchy

### 2. SyllabusStructureStorage Class

**Purpose**: Store and retrieve clean syllabus structure data

**Interface**:
```typescript
class SyllabusStructureStorage {
  // Store extracted syllabus structure
  async storeSyllabusStructure(
    course: string,
    tradeType: string,
    modules: ModuleStructure[]
  ): Promise<void>
  
  // Retrieve syllabus structure for a course
  async getSyllabusStructure(
    course: string,
    tradeType: string
  ): Promise<ModuleStructure[]>
  
  // Get specific module details
  async getModuleStructure(
    course: string,
    tradeType: string,
    moduleId: string
  ): Promise<ModuleStructure | null>
  
  // Clear syllabus data for reprocessing
  async clearSyllabusData(course?: string): Promise<void>
}
```

### 3. Enhanced PDF Processing Pipeline

**Purpose**: Coordinate index extraction alongside content processing

**Flow**:
```typescript
async function processPDF(pdfPath: string, course: string) {
  const tradeType = detectTradeType(pdfPath)
  
  // Step 1: Extract index structure (new)
  const indexExtractor = new IndexExtractor()
  const syllabusStructure = await indexExtractor.extractFromPDF(pdfPath)
  
  // Step 2: Store syllabus structure (new)
  const storage = new SyllabusStructureStorage()
  await storage.storeSyllabusStructure(course, tradeType, syllabusStructure)
  
  // Step 3: Extract content chunks (existing)
  const pdfProcessor = new PDFProcessor()
  const chunks = await pdfProcessor.processDocument(pdfPath, course)
  
  // Step 4: Store content chunks (existing)
  await storeChunks(chunks)
}
```

## Data Models

### Database Schema

#### New Table: module_syllabus (Index-based structure)

```sql
CREATE TABLE module_syllabus (
  id SERIAL PRIMARY KEY,
  course VARCHAR(50) NOT NULL,
  trade_type VARCHAR(20) NOT NULL,
  module_id VARCHAR(255) NOT NULL,
  module_name VARCHAR(255) NOT NULL,
  module_number INTEGER,
  topics JSONB NOT NULL,  -- Array of topic names
  extracted_from VARCHAR(10) DEFAULT 'index',  -- 'index' or 'content'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course, trade_type, module_id)
);

CREATE INDEX idx_module_syllabus_course_trade 
ON module_syllabus(course, trade_type);

CREATE INDEX idx_module_syllabus_module 
ON module_syllabus(course, trade_type, module_id);
```

**Example Data**:
```json
{
  "course": "electrician",
  "trade_type": "trade_theory",
  "module_id": "basic-electricity",
  "module_name": "Basic Electricity",
  "module_number": 1,
  "topics": [
    "Introduction to Electricity",
    "Voltage and Current",
    "Resistance and Ohm's Law",
    "Power and Energy",
    "Series and Parallel Circuits",
    "Electrical Safety"
  ],
  "extracted_from": "index"
}
```

#### Updated Table: knowledge_chunks (Content with BGE embeddings)

```sql
CREATE TABLE knowledge_chunks (
  id SERIAL PRIMARY KEY,
  course VARCHAR(50) NOT NULL,
  trade_type VARCHAR(20) NOT NULL,
  module VARCHAR(255),
  module_name VARCHAR(255),
  section VARCHAR(255),
  content TEXT NOT NULL,
  embedding vector(384),  -- BGE embeddings are 384-dimensional
  page_number INTEGER,
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_knowledge_chunks_course_module 
ON knowledge_chunks(course, trade_type, module);

CREATE INDEX idx_knowledge_chunks_embedding 
ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops);
```

**Key Changes**:
- Embedding dimension: 384 (BGE-small-en-v1.5 model)
- Separate storage: `module_syllabus` for display, `knowledge_chunks` for content
- BGE embeddings used for semantic search in quiz generation and chatbot

### Embedding Strategy

**BGE Model**: Using `BAAI/bge-small-en-v1.5` for local embeddings
- **Dimension**: 384
- **Performance**: ~34ms per embedding, 29 embeddings/second
- **Quality**: Better semantic understanding with normalized vectors
- **Local**: No API calls, completely offline
- **Separation**: Index extraction (no embeddings) vs Content extraction (with embeddings)

**Two-Stage Processing**:
1. **Index Extraction**: Parse index pages → Store in `module_syllabus` (no embeddings needed)
2. **Content Extraction**: Process full content → Generate BGE embeddings → Store in `knowledge_chunks`

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Index page detection accuracy

*For any* PDF page containing common index keywords ("Contents", "Index", "Table of Contents") and page number patterns, the system should correctly identify it as an index page.

**Validates: Requirements 4.1**

### Property 2: Topic name cleaning consistency

*For any* raw topic name containing formatting artifacts (dots, dashes, page numbers, QR codes), the cleaned version should contain only the meaningful topic text without artifacts.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 3: Module-topic association preservation

*For any* set of index entries where topics follow a module header, all topics should be correctly associated with their parent module in the resulting structure.

**Validates: Requirements 2.3**

### Property 4: Syllabus data independence

*For any* course with both syllabus structure and content chunks, modifying the syllabus structure should not affect the content chunks, and vice versa.

**Validates: Requirements 7.1, 7.4**

### Property 5: API fallback behavior

*For any* course without syllabus structure data, the API should return chunk-based data without errors.

**Validates: Requirements 6.4**

### Property 6: Content availability for AI features

*For any* module with syllabus structure, the full content chunks should remain available and searchable for quiz generation and chatbot queries.

**Validates: Requirements 7.2, 7.3, 7.5**

### Property 7: Index entry parsing completeness

*For any* index page with entries in different formats (dot leaders, dashes, indentation), the system should successfully parse and extract all entries.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 8: Hierarchical structure preservation

*For any* index with nested topics (module → topic → subtopic), the extracted structure should preserve the hierarchical relationships.

**Validates: Requirements 9.3**

### Property 9: Trade type consistency

*For any* PDF processed with a specific trade type, all extracted syllabus modules should be stored with the same trade type identifier.

**Validates: Requirements 5.4**

### Property 10: Extraction error isolation

*For any* PDF where index extraction fails, content extraction should still succeed, and vice versa.

**Validates: Requirements 10.5**

## Error Handling

### Index Extraction Errors

1. **No Index Found**: Log warning, continue with content extraction, mark syllabus as unavailable
2. **Malformed Index**: Extract what's parseable, log issues, provide partial structure
3. **Empty Index**: Log warning, fall back to content-based module detection

### Storage Errors

1. **Database Connection Failure**: Retry with exponential backoff, log error, fail gracefully
2. **Duplicate Module**: Update existing entry with new data
3. **Invalid Data**: Validate before storage, log validation errors, skip invalid entries

### API Errors

1. **Missing Syllabus Data**: Fall back to chunk-based display automatically
2. **Database Query Failure**: Return error response with appropriate status code
3. **Partial Data**: Return available data with metadata indicating completeness

## Testing Strategy

### Unit Testing

**Index Extraction**:
- Test index page detection with various formats
- Test topic name cleaning with different artifacts
- Test module-topic association logic
- Test hierarchical structure building

**Storage Operations**:
- Test CRUD operations on module_syllabus table
- Test data validation before storage
- Test duplicate handling

**API Endpoints**:
- Test syllabus retrieval with valid data
- Test fallback behavior with missing data
- Test error responses

### Property-Based Testing

Using **fast-check** library for TypeScript property-based testing (minimum 100 iterations per test):

**Property Tests**:
1. Index page detection (Property 1)
2. Topic name cleaning (Property 2)
3. Module-topic association (Property 3)
4. Data independence (Property 4)
5. API fallback (Property 5)
6. Content availability (Property 6)
7. Index parsing completeness (Property 7)
8. Hierarchical preservation (Property 8)
9. Trade type consistency (Property 9)
10. Error isolation (Property 10)

Each property test must:
- Be tagged with: `**Feature: syllabus-index-extraction, Property {number}: {property_text}**`
- Run minimum 100 iterations
- Reference the corresponding correctness property from this design document

### Integration Testing

- Test full PDF processing pipeline (index + content extraction)
- Test API with real database
- Test UI display with extracted syllabus data
- Test quiz generation with content chunks
- Test chatbot with content chunks

## Implementation Notes

### Index Detection Patterns

Common patterns to detect index pages:
- Keywords: "Contents", "Index", "Table of Contents", "Syllabus"
- Page number patterns: "... 15", "--- 23", ". . . 42"
- Early page position (typically pages 1-10)
- High density of page number references

### Topic Name Cleaning Rules

1. Remove trailing page numbers: `"Topic Name . . . . 15"` → `"Topic Name"`
2. Remove dot leaders: `"Topic . . . ."` → `"Topic"`
3. Remove dash leaders: `"Topic ---"` → `"Topic"`
4. Remove QR code references: `"(QR Code Pg. 15)"` → `""`
5. Trim whitespace: `"  Topic  "` → `"Topic"`
6. Preserve meaningful punctuation: `"AC/DC Theory"` → `"AC/DC Theory"`

### Module Detection in Index

Modules are typically:
- All caps or title case
- Not indented or minimally indented
- May have "Module" or "Unit" prefix
- May have numbers (Module 1, Unit 2)
- Followed by indented topics

### Performance Considerations

- Index extraction is fast (only processes first ~10 pages)
- Content extraction remains unchanged (processes all pages)
- Database queries use indexes for fast retrieval
- API responses prioritize syllabus data (smaller payload than chunks)

## Migration Strategy

1. **Phase 1**: Create new database table and indexes
2. **Phase 2**: Implement index extraction classes
3. **Phase 3**: Update PDF processing pipeline to include index extraction
4. **Phase 4**: Enhance API to use syllabus data with fallback
5. **Phase 5**: Update UI to display clean syllabus structure
6. **Phase 6**: Run extraction script on existing PDFs
7. **Phase 7**: Verify quiz and chatbot functionality unchanged

## Success Criteria

- Clean, readable syllabus display without PDF artifacts
- All modules show structured topic lists
- Quiz generation continues working with full content
- Chatbot continues working with full content
- API response time improves (smaller payload)
- System handles PDFs with different index formats
- Fallback works when index extraction fails
