# Implementation Plan

- [ ] 1. Create database schema for syllabus structure
  - Create module_syllabus table with course, trade_type, module_id, module_name, topics fields
  - Add indexes for efficient querying
  - Add migration script to create table
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 2. Implement IndexExtractor class
  - [ ] 2.1 Implement index page detection
    - Create isIndexPage() method with keyword and pattern detection
    - Check for "Contents", "Index", "Table of Contents" keywords
    - Detect page number patterns (dots, dashes)
    - Limit detection to first 10 pages
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ]* 2.2 Write property test for index page detection
    - **Property 1: Index page detection accuracy**
    - **Validates: Requirements 4.1**

  - [ ] 2.3 Implement index entry extraction
    - Create extractIndexEntries() method
    - Split page text into lines
    - Parse each line for index entries
    - Handle multi-line entries
    - _Requirements: 4.2, 9.4_

  - [ ]* 2.4 Write property test for index parsing completeness
    - **Property 7: Index entry parsing completeness**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [ ] 2.5 Implement topic name cleaning
    - Create cleanTopicName() method
    - Remove dot leaders (. . . .)
    - Remove dash leaders (---)
    - Remove page numbers
    - Remove QR code references
    - Trim whitespace
    - Preserve meaningful punctuation
    - _Requirements: 2.5, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 2.6 Write property test for topic name cleaning
    - **Property 2: Topic name cleaning consistency**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

  - [ ] 2.7 Implement module structure building
    - Create buildModuleStructure() method
    - Detect module headers (all caps, not indented)
    - Group topics under modules
    - Handle hierarchical relationships
    - Extract module numbers if present
    - _Requirements: 2.3, 9.3_

  - [ ]* 2.8 Write property test for module-topic association
    - **Property 3: Module-topic association preservation**
    - **Validates: Requirements 2.3**

  - [ ]* 2.9 Write property test for hierarchical structure
    - **Property 8: Hierarchical structure preservation**
    - **Validates: Requirements 9.3**

  - [ ] 2.10 Implement full PDF index extraction
    - Create extractFromPDF() method
    - Iterate through first 10 pages
    - Identify index pages
    - Extract and combine all entries
    - Build final module structure
    - Handle errors gracefully
    - _Requirements: 4.2, 4.3, 4.4_

- [ ] 3. Implement SyllabusStructureStorage class
  - [ ] 3.1 Implement storage methods
    - Create storeSyllabusStructure() method
    - Validate data before storage
    - Handle duplicate modules (upsert)
    - Store topics as JSONB array
    - _Requirements: 3.2, 3.3_

  - [ ] 3.2 Implement retrieval methods
    - Create getSyllabusStructure() method for course listing
    - Create getModuleStructure() method for module details
    - Add proper error handling
    - _Requirements: 3.5_

  - [ ] 3.3 Implement data management methods
    - Create clearSyllabusData() method
    - Add method to check if syllabus exists
    - Add method to get extraction statistics
    - _Requirements: 5.3_

  - [ ]* 3.4 Write unit tests for storage operations
    - Test CRUD operations
    - Test duplicate handling
    - Test data validation
    - Test error scenarios

- [ ] 4. Update PDF processing pipeline
  - [ ] 4.1 Integrate index extraction into process-pdfs script
    - Import IndexExtractor and SyllabusStructureStorage
    - Run index extraction before content processing
    - Store extracted syllabus structure
    - Log extraction statistics
    - Continue on errors (don't fail entire process)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.4_

  - [ ]* 4.2 Write property test for error isolation
    - **Property 10: Extraction error isolation**
    - **Validates: Requirements 10.5**

  - [ ] 4.3 Add logging for index extraction
    - Log when index pages are found
    - Log number of modules and topics extracted
    - Log warnings when no index found
    - Log errors with details
    - _Requirements: 4.4, 5.3_

- [ ] 5. Checkpoint - Test index extraction
  - Run extraction on sample PDF
  - Verify database contains syllabus structure
  - Check that topics are clean and readable
  - Ensure content chunks are unaffected
  - Ensure all tests pass, ask the user if questions arise

- [ ] 6. Update API routes for syllabus display
  - [ ] 6.1 Update syllabus course route
    - Modify /api/rag/syllabus/:course to query module_syllabus table
    - Return module names and topic counts
    - Include metadata indicating data source (index vs chunks)
    - Fall back to chunk-based data if syllabus unavailable
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

  - [ ]* 6.2 Write property test for API fallback
    - **Property 5: API fallback behavior**
    - **Validates: Requirements 6.4**

  - [ ] 6.3 Update syllabus module detail route
    - Modify /api/rag/syllabus/:course/:module to query module_syllabus
    - Return module name and clean topic list
    - Include metadata about data source
    - Fall back to chunks if needed
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

  - [ ]* 6.4 Write unit tests for API endpoints
    - Test with syllabus data present
    - Test with syllabus data missing (fallback)
    - Test error scenarios
    - Test metadata inclusion

- [ ] 7. Update UI components for clean display
  - [ ] 7.1 Update SyllabusExplorer component
    - Display module name from syllabus data
    - Display topics as clean list (no chunks)
    - Show topic count
    - Handle fallback to chunk display
    - Add visual indicator for data source
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 7.2 Add loading and empty states
    - Show loading state while fetching
    - Show message when no syllabus available
    - Show fallback indicator when using chunks
    - _Requirements: 1.3_

  - [ ]* 7.3 Write unit tests for UI components
    - Test syllabus data display
    - Test fallback display
    - Test loading states
    - Test empty states

- [ ] 8. Verify content layer independence
  - [ ]* 8.1 Write property test for data independence
    - **Property 4: Syllabus data independence**
    - **Validates: Requirements 7.1, 7.4**

  - [ ]* 8.2 Write property test for content availability
    - **Property 6: Content availability for AI features**
    - **Validates: Requirements 7.2, 7.3, 7.5**

  - [ ] 8.3 Test quiz generation with content chunks
    - Verify quiz generation still works
    - Verify it uses knowledge_chunks table
    - Verify syllabus changes don't affect quizzes
    - _Requirements: 7.2_

  - [ ] 8.4 Test chatbot with content chunks
    - Verify chatbot search still works
    - Verify it uses knowledge_chunks table
    - Verify syllabus changes don't affect chatbot
    - _Requirements: 7.3_

- [ ] 9. Create extraction and management scripts
  - [ ] 9.1 Create extract-syllabus-structure script
    - Process all PDFs in course directories
    - Extract index-based syllabus structure
    - Store in module_syllabus table
    - Log statistics per course/trade type
    - Handle errors gracefully
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 9.2 Write property test for trade type consistency
    - **Property 9: Trade type consistency**
    - **Validates: Requirements 5.4**

  - [ ] 9.3 Create clear-syllabus-data script
    - Clear module_syllabus table
    - Optionally clear for specific course
    - Log confirmation
    - _Requirements: 5.3_

  - [ ] 9.4 Create verify-syllabus-structure script
    - Check syllabus data completeness
    - Compare with content chunks
    - Report statistics
    - Identify missing or incomplete data

- [ ] 10. Final Checkpoint - Full system verification
  - Run extract-syllabus-structure on all PDFs
  - Verify clean syllabus display in UI
  - Verify quiz generation works
  - Verify chatbot works
  - Run all tests
  - Ensure all tests pass, ask the user if questions arise
