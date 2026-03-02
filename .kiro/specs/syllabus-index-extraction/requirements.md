# Requirements Document

## Introduction

This feature extracts structured syllabus information from PDF table of contents/index pages to provide a clean, organized display of course modules and topics. The system will separate the display layer (clean module structure) from the content layer (full text for quizzes and chatbot), ensuring users see a professional syllabus interface while maintaining rich content for AI-powered features.

## Glossary

- **Index Page**: The table of contents or index section at the beginning of a PDF that lists modules and topics with page numbers
- **Module**: A major learning unit within a course (e.g., "Basic Electricity", "Power Systems")
- **Topic**: A specific subject within a module (e.g., "Ohm's Law", "Circuit Analysis")
- **Syllabus Display**: The user-facing interface showing course structure
- **Content Store**: The backend storage of full PDF content used for quiz generation and chatbot responses
- **Trade Type**: Either "Theory" (TT) or "Practical" (TP) designation for course materials
- **Course**: The overall training program (e.g., "Electrician", "Fitter")

## Requirements

### Requirement 1

**User Story:** As a student, I want to see a clean, organized syllabus with module names and topics, so that I can understand the course structure without seeing messy PDF content.

#### Acceptance Criteria

1. WHEN a user views a module in the syllabus THEN the system SHALL display the module name and a list of topics extracted from the index
2. WHEN displaying module topics THEN the system SHALL show topic names without page numbers or formatting artifacts
3. WHEN no index data is available THEN the system SHALL display a fallback message indicating the syllabus structure is being processed
4. THE system SHALL NOT display raw PDF chunk content in the syllabus view
5. WHEN topics are displayed THEN the system SHALL format them as a clean, hierarchical list

### Requirement 2

**User Story:** As a system, I want to extract module and topic structure from PDF index pages, so that I can provide accurate syllabus information to users.

#### Acceptance Criteria

1. WHEN processing a PDF THEN the system SHALL identify and extract content from index/table of contents pages
2. WHEN parsing index content THEN the system SHALL extract module names, topic names, and their hierarchical relationships
3. WHEN a module heading is detected in the index THEN the system SHALL associate all subsequent topics with that module until a new module is detected
4. WHEN page numbers are present in index entries THEN the system SHALL remove them from the display data
5. WHEN formatting artifacts (dots, dashes, QR codes) are present THEN the system SHALL clean them from topic names

### Requirement 3

**User Story:** As a developer, I want to store extracted syllabus structure separately from content chunks, so that the display layer and content layer remain independent.

#### Acceptance Criteria

1. THE system SHALL create a database table for storing module structure data
2. WHEN syllabus structure is extracted THEN the system SHALL store module names, topic lists, and course metadata
3. WHEN storing syllabus data THEN the system SHALL include course, trade_type, and module identifiers
4. THE system SHALL maintain existing knowledge_chunks table for full content storage
5. WHEN querying syllabus data THEN the system SHALL retrieve structured data from the syllabus table, not from content chunks

### Requirement 4

**User Story:** As a system, I want to detect index pages automatically, so that I can extract syllabus structure without manual configuration.

#### Acceptance Criteria

1. WHEN processing PDF pages THEN the system SHALL identify index pages by detecting common patterns (e.g., "Contents", "Index", "Table of Contents")
2. WHEN an index page is detected THEN the system SHALL extract all entries until the index section ends
3. WHEN multiple index pages exist THEN the system SHALL combine entries from all index pages
4. WHEN no clear index is found THEN the system SHALL log a warning and continue processing
5. THE system SHALL detect index pages within the first 10 pages of the PDF

### Requirement 5

**User Story:** As a system administrator, I want to reprocess PDFs to extract index-based syllabus data, so that I can update the syllabus display with clean structure.

#### Acceptance Criteria

1. THE system SHALL provide a script to extract syllabus structure from existing PDFs
2. WHEN running the extraction script THEN the system SHALL process all PDFs in course directories
3. WHEN extraction completes THEN the system SHALL log statistics showing modules and topics extracted per course
4. THE system SHALL detect trade type (TT/TP) from filenames during extraction
5. WHEN errors occur during extraction THEN the system SHALL log details and continue processing remaining files

### Requirement 6

**User Story:** As a user, I want the syllabus API to return clean module structure, so that the UI displays organized course information.

#### Acceptance Criteria

1. WHEN requesting module list for a course THEN the API SHALL return module names and topic counts from the syllabus table
2. WHEN requesting module details THEN the API SHALL return the module name and list of topics
3. WHEN syllabus data exists THEN the API SHALL prioritize it over chunk-based data
4. WHEN no syllabus data exists THEN the API SHALL fall back to existing chunk-based display
5. THE API SHALL include metadata indicating whether data is from index extraction or fallback

### Requirement 7

**User Story:** As a developer, I want the content chunks to remain unchanged, so that quiz generation and chatbot functionality continue working with full content.

#### Acceptance Criteria

1. THE system SHALL maintain all existing content in the knowledge_chunks table
2. WHEN generating quizzes THEN the system SHALL use full content from knowledge_chunks
3. WHEN answering chatbot queries THEN the system SHALL search and retrieve from knowledge_chunks
4. THE syllabus extraction process SHALL NOT modify or delete existing chunk data
5. WHEN both syllabus structure and content chunks exist THEN the system SHALL use syllabus for display and chunks for content retrieval

### Requirement 8

**User Story:** As a student, I want to see topic names that are properly formatted and readable, so that I can easily understand what each section covers.

#### Acceptance Criteria

1. WHEN displaying topic names THEN the system SHALL remove leading/trailing whitespace
2. WHEN topic names contain special characters (dots, dashes, underscores) used for formatting THEN the system SHALL remove them
3. WHEN topic names contain page number references THEN the system SHALL remove them
4. WHEN topic names contain QR code references THEN the system SHALL remove them
5. THE system SHALL preserve meaningful punctuation and capitalization in topic names

### Requirement 9

**User Story:** As a system, I want to handle PDFs with different index formats, so that syllabus extraction works across various document structures.

#### Acceptance Criteria

1. WHEN index entries use dot leaders (e.g., "Topic . . . . 15") THEN the system SHALL extract the topic name correctly
2. WHEN index entries use dash separators (e.g., "Topic --- 15") THEN the system SHALL extract the topic name correctly
3. WHEN index entries are indented to show hierarchy THEN the system SHALL preserve the hierarchical relationship
4. WHEN index entries span multiple lines THEN the system SHALL combine them into complete topic names
5. THE system SHALL handle both numbered and unnumbered index entries

### Requirement 10

**User Story:** As a developer, I want clear separation between index extraction and content processing, so that each system component has a single responsibility.

#### Acceptance Criteria

1. THE system SHALL create a separate IndexExtractor class for parsing index pages
2. THE system SHALL create a separate SyllabusStructureStorage class for storing extracted structure
3. THE existing PDFProcessor SHALL continue handling content extraction for knowledge_chunks
4. WHEN processing a PDF THEN the system SHALL run index extraction and content extraction as separate operations
5. THE system SHALL allow index extraction to succeed even if content extraction fails, and vice versa
