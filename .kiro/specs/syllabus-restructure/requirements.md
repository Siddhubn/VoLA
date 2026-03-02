# Requirements Document

## Introduction

This document outlines the requirements for restructuring the syllabus system to properly extract and organize course content by modules and trade types (Theory vs Practical). The system should parse PDF content to identify module boundaries and organize content hierarchically by Course → Trade Type → Module → Sections.

## Glossary

- **System**: The ITI course syllabus and RAG knowledge base system
- **Course**: A training program (Electrician or Fitter)
- **Trade Type**: The category of training material (Trade Theory or Trade Practical)
- **Module**: A distinct learning unit within a course (e.g., "Module 1 - Safety Practice and Hand Tools")
- **Section**: A subsection or topic within a module
- **Knowledge Chunk**: A text segment stored in the database with embeddings
- **PDF Processor**: The component that extracts and structures content from PDF files
- **Syllabus Explorer**: The UI component that displays course structure

## Requirements

### Requirement 1

**User Story:** As a student, I want to select between Trade Theory and Trade Practical content, so that I can focus on the specific type of training material I need.

#### Acceptance Criteria

1. WHEN a user visits the syllabus page THEN the system SHALL display course selection buttons (Electrician and Fitter)
2. WHEN a user selects a course THEN the system SHALL display trade type selection buttons (Trade Theory and Trade Practical)
3. WHEN the syllabus page loads THEN the system SHALL default to Electrician course and Trade Theory type
4. WHEN a user changes trade type THEN the system SHALL update the displayed modules without page reload
5. WHEN a user changes course THEN the system SHALL reset trade type to Trade Theory

### Requirement 2

**User Story:** As a system administrator, I want the PDF processor to automatically extract module information from course PDFs, so that content is properly organized without manual intervention.

#### Acceptance Criteria

1. WHEN processing a PDF THEN the system SHALL detect module headers using pattern matching
2. WHEN a module header is detected THEN the system SHALL extract the module number and name
3. WHEN processing content THEN the system SHALL associate each chunk with the current module context
4. WHEN a new module is detected THEN the system SHALL update the module context for subsequent chunks
5. WHEN no module is detected THEN the system SHALL assign chunks to a default "General Content" module

### Requirement 3

**User Story:** As a developer, I want the knowledge base schema to support hierarchical organization, so that content can be queried by course, trade type, and module.

#### Acceptance Criteria

1. WHEN storing a knowledge chunk THEN the system SHALL include course, trade_type, module, and section fields
2. WHEN querying modules THEN the system SHALL filter by course and trade_type
3. WHEN retrieving module details THEN the system SHALL return all chunks for that specific module
4. WHEN performing semantic search THEN the system SHALL respect course and trade_type filters
5. WHEN displaying results THEN the system SHALL include module and trade_type metadata

### Requirement 4

**User Story:** As a student, I want to see modules organized with their proper names and numbers, so that I can navigate the curriculum structure easily.

#### Acceptance Criteria

1. WHEN viewing the syllabus THEN the system SHALL display modules in numerical order
2. WHEN displaying a module THEN the system SHALL show the module number and full name
3. WHEN a module contains sections THEN the system SHALL display sections within that module
4. WHEN viewing module content THEN the system SHALL show page numbers if available
5. WHEN no content exists for a trade type THEN the system SHALL display an appropriate message

### Requirement 5

**User Story:** As a system administrator, I want to clear and rebuild the knowledge base, so that I can reprocess PDFs with improved extraction logic.

#### Acceptance Criteria

1. WHEN running the clear script THEN the system SHALL delete all knowledge chunks and embeddings
2. WHEN running the process script THEN the system SHALL detect trade type from filename patterns
3. WHEN processing files THEN the system SHALL extract module information from content
4. WHEN processing completes THEN the system SHALL log statistics by course, trade type, and module
5. WHEN errors occur THEN the system SHALL log detailed error information and continue processing
