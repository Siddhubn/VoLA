# Design Document

## Overview

This design restructures the syllabus system to support hierarchical organization by Course → Trade Type → Module → Sections. The system will parse PDF content to automatically extract module information and provide a UI for navigating between Trade Theory and Trade Practical content.

## Architecture

The system consists of four main layers:

1. **Data Layer**: PostgreSQL database with updated schema to support trade_type field
2. **Processing Layer**: Enhanced PDF processor with module detection and extraction
3. **API Layer**: Updated routes to support trade_type filtering
4. **UI Layer**: Enhanced syllabus explorer with trade type selection

### Data Flow

```
PDF Files → PDF Processor (with module detection) → Knowledge Chunks (with trade_type) → Database
                                                                                            ↓
User → UI (Course + Trade Type Selection) → API Routes (filtered queries) → Formatted Results
```

## Components and Interfaces

### 1. Database Schema Updates

Add `trade_type` field to `knowledge_chunks` table:

```sql
ALTER TABLE knowledge_chunks 
ADD COLUMN trade_type VARCHAR(20);

CREATE INDEX idx_knowledge_chunks_trade_type 
ON knowledge_chunks(course, trade_type, module);
```

### 2. PDF Processor Enhancement

**Module Detection Patterns:**
- Pattern 1: `Module \d+ - .+` (e.g., "Module 1 - Safety Practice")
- Pattern 2: `Module \d+: .+` (e.g., "Module 1: Safety Practice")
- Pattern 3: `MODULE \d+ .+` (case insensitive)

**Trade Type Detection:**
- Filename contains "TT" or "Trade Theory" → `trade_theory`
- Filename contains "TP" or "Trade Practical" → `trade_practical`
- Default: `trade_theory`

**Interface:**
```typescript
interface ModuleContext {
  moduleNumber: number | null
  moduleName: string | null
  fullModuleName: string // "Module 1 - Safety Practice"
}

interface ProcessingMetadata {
  course: string
  tradeType: 'trade_theory' | 'trade_practical'
  moduleContext: ModuleContext
}
```

### 3. API Routes

**Updated Routes:**
- `GET /api/rag/syllabus/:course?tradeType=theory|practical` - List modules
- `GET /api/rag/syllabus/:course/:module?tradeType=theory|practical` - Module details
- `POST /api/rag/chat` - Updated to include trade_type in search filters

### 4. UI Components

**SyllabusExplorer Updates:**
- Add trade type selector (Theory/Practical buttons)
- Update state management to include tradeType
- Update API calls to include tradeType parameter
- Display "No content available" when trade type has no modules

## Data Models

### Knowledge Chunk (Updated)

```typescript
interface KnowledgeChunk {
  id: number
  course: 'fitter' | 'electrician'
  trade_type: 'trade_theory' | 'trade_practical'
  module: string // "module-1-safety-practice"
  module_name: string // "Module 1 - Safety Practice and Hand Tools"
  section: string | null
  content: string
  embedding: number[]
  page_number: number | null
  chunk_index: number
  created_at: Date
}
```

### Module Info (Updated)

```typescript
interface ModuleInfo {
  id: string
  name: string
  moduleNumber: number
  topics: string[]
  chunkCount: number
  pageRange: string
  description?: string
  tradeType: 'trade_theory' | 'trade_practical'
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Trade type selection updates modules
*For any* course and trade type selection, changing the trade type should result in fetching and displaying only modules for that specific trade type
**Validates: Requirements 1.4**

### Property 2: Course change resets trade type
*For any* course selection change, the trade type should reset to "trade_theory"
**Validates: Requirements 1.5**

### Property 3: Module header detection extracts number and name
*For any* text containing a valid module header pattern, the system should extract both the module number and module name correctly
**Validates: Requirements 2.2**

### Property 4: Chunk module association
*For any* chunk processed after a module header is detected, that chunk should be associated with the detected module
**Validates: Requirements 2.3**

### Property 5: Module context updates on new module
*For any* sequence of chunks where a new module header appears, all chunks after the header should have the new module context
**Validates: Requirements 2.4**

### Property 6: Default module assignment
*For any* chunk processed without a detected module context, it should be assigned to the "General Content" module
**Validates: Requirements 2.5**

### Property 7: Chunk storage completeness
*For any* knowledge chunk stored, it must include non-null values for course, trade_type, module, and content fields
**Validates: Requirements 3.1**

### Property 8: Module query filtering
*For any* module query with course and trade_type filters, the returned modules should only match those exact filter values
**Validates: Requirements 3.2**

### Property 9: Module detail completeness
*For any* module detail query, all chunks belonging to that module should be included in the response
**Validates: Requirements 3.3**

### Property 10: Search result filtering
*For any* semantic search with course and trade_type filters, all results should match the specified filters
**Validates: Requirements 3.4**

### Property 11: Result metadata presence
*For any* search or query result, the response should include module and trade_type metadata
**Validates: Requirements 3.5**

### Property 12: Module numerical ordering
*For any* list of modules displayed, they should be sorted in ascending order by module number
**Validates: Requirements 4.1**

### Property 13: Trade type filename detection
*For any* filename containing "TT" or "TP", the system should correctly identify it as trade_theory or trade_practical respectively
**Validates: Requirements 5.2**

### Property 14: Module extraction from files
*For any* PDF file processed, if it contains module headers, those modules should be extracted and stored
**Validates: Requirements 5.3**

## Error Handling

1. **Missing Trade Type**: Default to `trade_theory` if not specified
2. **Invalid Trade Type**: Return 400 error with valid options
3. **No Modules Found**: Return empty array with success=true
4. **Module Detection Failure**: Assign to "General Content" and log warning
5. **Database Errors**: Return 503 with retry message

## Testing Strategy

### Unit Tests

- Test module header regex patterns with various formats
- Test trade type detection from filenames
- Test module context state management during processing
- Test API route parameter validation
- Test UI component state transitions

### Property-Based Tests

Property-based tests will use **fast-check** library for TypeScript. Each test will run a minimum of 100 iterations.

- **Property 1-2**: Generate random course and trade type selections, verify state updates
- **Property 3**: Generate random module header strings, verify extraction
- **Property 4-6**: Generate random chunk sequences with module headers, verify associations
- **Property 7**: Generate random chunks, verify all required fields are present
- **Property 8-11**: Generate random queries with filters, verify filtering correctness
- **Property 12**: Generate random module lists, verify sorting
- **Property 13**: Generate random filenames, verify trade type detection
- **Property 14**: Generate random PDF content with modules, verify extraction

### Integration Tests

- End-to-end test: Clear DB → Process PDFs → Query modules → Verify structure
- Test full user flow: Select course → Select trade type → View modules → View content
- Test search across trade types
