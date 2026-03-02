# Implementation Plan

- [x] 1. Update database schema and add trade_type field




  - Add trade_type column to knowledge_chunks table
  - Create index on (course, trade_type, module)
  - Add module_name column for storing full module names
  - _Requirements: 3.1, 3.2_

- [x] 2. Enhance PDF processor with module detection





  - [x] 2.1 Implement module header detection patterns


    - Create regex patterns for module header detection
    - Implement pattern matching logic
    - Add tests for various module header formats
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 Write property test for module header extraction


    - **Property 3: Module header detection extracts number and name**
    - **Validates: Requirements 2.2**

  - [x] 2.3 Implement module context tracking during processing


    - Add ModuleContext state management
    - Update context when new module is detected
    - Associate chunks with current module context
    - _Requirements: 2.3, 2.4_

  - [x] 2.4 Write property test for chunk module association


    - **Property 4: Chunk module association**
    - **Validates: Requirements 2.3**

  - [x] 2.5 Write property test for module context updates


    - **Property 5: Module context updates on new module**
    - **Validates: Requirements 2.4**

  - [x] 2.6 Implement trade type detection from filenames


    - Add filename pattern matching for TT/TP
    - Set default to trade_theory
    - _Requirements: 5.2_

  - [x] 2.7 Write property test for trade type detection


    - **Property 13: Trade type filename detection**
    - **Validates: Requirements 5.2**

  - [x] 2.8 Implement default module assignment



    - Assign chunks without module to "General Content"
    - Log warnings for undetected modules
    - _Requirements: 2.5_

  - [x] 2.9 Write property test for default module assignment


    - **Property 6: Default module assignment**
    - **Validates: Requirements 2.5**

  - [x] 2.10 Update chunk storage to include all required fields


    - Ensure course, trade_type, module, module_name are set
    - Add validation before storage
    - _Requirements: 3.1_

  - [x] 2.11 Write property test for chunk storage completeness


    - **Property 7: Chunk storage completeness**
    - **Validates: Requirements 3.1**

- [x] 3. Update API routes to support trade_type filtering




  - [x] 3.1 Update syllabus course route


    - Add tradeType query parameter
    - Filter modules by trade_type
    - Update response to include trade_type
    - _Requirements: 3.2, 3.5_

  - [x] 3.2 Write property test for module query filtering


    - **Property 8: Module query filtering**
    - **Validates: Requirements 3.2**

  - [x] 3.3 Update syllabus module detail route


    - Add tradeType query parameter
    - Filter chunks by trade_type
    - Ensure all module chunks are returned
    - _Requirements: 3.3_

  - [x] 3.4 Write property test for module detail completeness


    - **Property 9: Module detail completeness**
    - **Validates: Requirements 3.3**

  - [x] 3.5 Update chat/search route



    - Add trade_type to search filters
    - Ensure results respect filters
    - Include metadata in results
    - _Requirements: 3.4, 3.5_

  - [x] 3.6 Write property test for search filtering



    - **Property 10: Search result filtering**
    - **Validates: Requirements 3.4**

  - [x] 3.7 Write property test for result metadata

    - **Property 11: Result metadata presence**
    - **Validates: Requirements 3.5**

- [x] 4. Update UI components for trade type selection




  - [x] 4.1 Add trade type state to SyllabusExplorer


    - Add tradeType state variable
    - Default to 'trade_theory'
    - _Requirements: 1.3_

  - [x] 4.2 Create trade type selector UI


    - Add Theory/Practical toggle buttons
    - Style similar to course selector
    - _Requirements: 1.2_

  - [x] 4.3 Implement trade type change handler


    - Update state on selection
    - Fetch new modules
    - Clear expanded modules
    - _Requirements: 1.4_

  - [x] 4.4 Write property test for trade type updates


    - **Property 1: Trade type selection updates modules**
    - **Validates: Requirements 1.4**

  - [x] 4.5 Implement course change handler


    - Reset trade type to 'trade_theory'
    - Fetch new modules
    - _Requirements: 1.5_

  - [x] 4.6 Write property test for course change reset


    - **Property 2: Course change resets trade type**
    - **Validates: Requirements 1.5**

  - [x] 4.7 Update API calls to include tradeType parameter


    - Add tradeType to module list fetch
    - Add tradeType to module detail fetch
    - _Requirements: 3.2, 3.3_

  - [x] 4.8 Add empty state for no content


    - Display message when no modules exist
    - Show for specific trade type
    - _Requirements: 4.5_

  - [x] 4.9 Implement module numerical sorting

    - Extract module numbers
    - Sort modules by number
    - _Requirements: 4.1_

  - [x] 4.10 Write property test for module ordering



    - **Property 12: Module numerical ordering**
    - **Validates: Requirements 4.1**

- [x] 5. Create scripts for clearing and reprocessing data




  - [x] 5.1 Update clear-rag-data script


    - Clear all knowledge chunks
    - Clear all embeddings
    - Log confirmation
    - _Requirements: 5.1_

  - [x] 5.2 Update process-pdfs script


    - Use enhanced PDF processor
    - Detect trade type from filenames
    - Extract and store module information
    - Log statistics by course, trade_type, module
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 5.3 Write property test for module extraction


    - **Property 14: Module extraction from files**
    - **Validates: Requirements 5.3**

  - [x] 5.4 Add error handling and logging

    - Log errors with details
    - Continue processing on errors
    - _Requirements: 5.5_

- [x] 6. Checkpoint - Clear and rebuild knowledge base





  - Run clear-rag-data script
  - Run process-pdfs script for electrician PDFs
  - Verify modules are properly extracted
  - Check database for correct structure
  - Ensure all tests pass, ask the user if questions arise

- [x] 7. Final testing and verification


  - [x] 7.1 Test UI flow


    - Verify course selection works
    - Verify trade type selection works
    - Verify modules display correctly
    - Verify module details load properly

  - [x] 7.2 Test API endpoints

    - Test with different course/trade_type combinations
    - Verify filtering works correctly
    - Verify empty states

  - [x] 7.3 Test search functionality

    - Verify search respects trade_type filter
    - Verify results include correct metadata

- [x] 8. Final Checkpoint



  - Ensure all tests pass, ask the user if questions arise
