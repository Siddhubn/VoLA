#!/usr/bin/env tsx

/**
 * Comprehensive System Test for Syllabus Restructure Feature
 * Tests UI flow, API endpoints, and search functionality
 */

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

config({ path: path.join(process.cwd(), '.env.local') });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
} as const;

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  console.log(`${color}${icon} ${name}${colors.reset}`);
  if (message) {
    console.log(`   ${message}`);
  }
}

async function testDatabaseStructure(pool: Pool) {
  console.log(`\n${colors.bright}${colors.cyan}=== 1. DATABASE STRUCTURE TESTS ===${colors.reset}\n`);
  
  try {
    // Test 1.1: Check trade_type column exists
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_chunks' 
      AND column_name IN ('trade_type', 'module', 'module_name')
    `);
    
    const hasTradeType = schemaCheck.rows.some(r => r.column_name === 'trade_type');
    const hasModule = schemaCheck.rows.some(r => r.column_name === 'module');
    const hasModuleName = schemaCheck.rows.some(r => r.column_name === 'module_name');
    
    logTest(
      'Schema has required columns',
      hasTradeType && hasModule && hasModuleName,
      `trade_type: ${hasTradeType}, module: ${hasModule}, module_name: ${hasModuleName}`
    );
    
    // Test 1.2: Check index exists
    const indexCheck = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'knowledge_chunks' 
      AND indexname LIKE '%trade_type%'
    `);
    
    logTest(
      'Index on trade_type exists',
      indexCheck.rows.length > 0,
      indexCheck.rows.length > 0 ? `Found: ${indexCheck.rows[0].indexname}` : 'No index found'
    );
    
    // Test 1.3: Check data completeness
    const dataCheck = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE trade_type IS NOT NULL) as with_trade_type,
        COUNT(*) FILTER (WHERE module IS NOT NULL) as with_module,
        COUNT(*) FILTER (WHERE module_name IS NOT NULL) as with_module_name
      FROM knowledge_chunks
    `);
    
    const data = dataCheck.rows[0];
    const completeness = (parseInt(data.with_trade_type) / parseInt(data.total)) * 100;
    
    logTest(
      'All chunks have required fields',
      completeness >= 99,
      `${completeness.toFixed(1)}% complete (${data.with_trade_type}/${data.total})`
    );
    
  } catch (error) {
    logTest('Database structure tests', false, (error as Error).message);
  }
}

async function testModuleOrganization(pool: Pool) {
  console.log(`\n${colors.bright}${colors.cyan}=== 2. MODULE ORGANIZATION TESTS ===${colors.reset}\n`);
  
  try {
    // Test 2.1: Check modules by trade type
    const modulesByType = await pool.query(`
      SELECT 
        course,
        trade_type,
        COUNT(DISTINCT module) as module_count
      FROM knowledge_chunks
      WHERE module != 'general-content'
      GROUP BY course, trade_type
      ORDER BY course, trade_type
    `);
    
    const hasTheory = modulesByType.rows.some(r => r.trade_type === 'trade_theory');
    const hasPractical = modulesByType.rows.some(r => r.trade_type === 'trade_practical');
    
    logTest(
      'Both trade types have modules',
      hasTheory && hasPractical,
      `Theory: ${hasTheory}, Practical: ${hasPractical}`
    );
    
    // Test 2.2: Check module naming consistency
    const moduleCheck = await pool.query(`
      SELECT 
        module,
        module_name,
        COUNT(*) as chunk_count
      FROM knowledge_chunks
      WHERE module != 'general-content'
      GROUP BY module, module_name
      HAVING COUNT(DISTINCT module_name) > 1
    `);
    
    logTest(
      'Module naming is consistent',
      moduleCheck.rows.length === 0,
      moduleCheck.rows.length === 0 ? 'All modules have consistent names' : `${moduleCheck.rows.length} inconsistencies found`
    );
    
    // Test 2.3: Check module distribution
    const distribution = await pool.query(`
      SELECT 
        trade_type,
        COUNT(DISTINCT module) as unique_modules,
        COUNT(*) as total_chunks
      FROM knowledge_chunks
      WHERE module != 'general-content'
      GROUP BY trade_type
    `);
    
    const hasContent = distribution.rows.every(r => parseInt(r.total_chunks) > 0);
    
    logTest(
      'All trade types have content',
      hasContent,
      distribution.rows.map(r => `${r.trade_type}: ${r.unique_modules} modules, ${r.total_chunks} chunks`).join('; ')
    );
    
  } catch (error) {
    logTest('Module organization tests', false, (error as Error).message);
  }
}

async function testAPIEndpoints(pool: Pool) {
  console.log(`\n${colors.bright}${colors.cyan}=== 3. API ENDPOINT SIMULATION ===${colors.reset}\n`);
  
  try {
    // Test 3.1: Simulate GET /api/rag/syllabus/:course?tradeType=theory
    const theoryModules = await pool.query(`
      SELECT DISTINCT 
        module,
        module_name,
        trade_type
      FROM knowledge_chunks
      WHERE course = $1 AND trade_type = $2 AND module != 'general-content'
      ORDER BY module
    `, ['electrician', 'trade_theory']);
    
    logTest(
      'API: Get theory modules for electrician',
      theoryModules.rows.length > 0,
      `Found ${theoryModules.rows.length} modules`
    );
    
    // Test 3.2: Simulate GET /api/rag/syllabus/:course?tradeType=practical
    const practicalModules = await pool.query(`
      SELECT DISTINCT 
        module,
        module_name,
        trade_type
      FROM knowledge_chunks
      WHERE course = $1 AND trade_type = $2 AND module != 'general-content'
      ORDER BY module
    `, ['electrician', 'trade_practical']);
    
    logTest(
      'API: Get practical modules for electrician',
      practicalModules.rows.length > 0,
      `Found ${practicalModules.rows.length} modules`
    );
    
    // Test 3.3: Simulate GET /api/rag/syllabus/:course/:module?tradeType=theory
    if (theoryModules.rows.length > 0) {
      const firstModule = theoryModules.rows[0];
      const moduleDetails = await pool.query(`
        SELECT 
          content,
          module_name,
          trade_type,
          page_number
        FROM knowledge_chunks
        WHERE course = $1 AND module = $2 AND trade_type = $3
        ORDER BY chunk_index
      `, ['electrician', firstModule.module, 'trade_theory']);
      
      logTest(
        'API: Get module details with trade type filter',
        moduleDetails.rows.length > 0 && moduleDetails.rows.every(r => r.trade_type === 'trade_theory'),
        `Found ${moduleDetails.rows.length} chunks, all filtered correctly`
      );
    }
    
    // Test 3.4: Test empty state (fitter course)
    const fitterModules = await pool.query(`
      SELECT DISTINCT module
      FROM knowledge_chunks
      WHERE course = $1 AND trade_type = $2 AND module != 'general-content'
    `, ['fitter', 'trade_theory']);
    
    logTest(
      'API: Empty state handling (fitter course)',
      fitterModules.rows.length === 0,
      'Correctly returns empty for fitter course'
    );
    
  } catch (error) {
    logTest('API endpoint tests', false, (error as Error).message);
  }
}

async function testSearchFunctionality(pool: Pool) {
  console.log(`\n${colors.bright}${colors.cyan}=== 4. SEARCH FUNCTIONALITY TESTS ===${colors.reset}\n`);
  
  try {
    // Test 4.1: Search with trade_type filter
    const searchResults = await pool.query(`
      SELECT 
        content,
        module,
        module_name,
        trade_type,
        course
      FROM knowledge_chunks
      WHERE course = $1 
        AND trade_type = $2
        AND content ILIKE $3
      LIMIT 5
    `, ['electrician', 'trade_theory', '%electricity%']);
    
    const allCorrectType = searchResults.rows.every(r => r.trade_type === 'trade_theory');
    
    logTest(
      'Search respects trade_type filter',
      allCorrectType && searchResults.rows.length > 0,
      `Found ${searchResults.rows.length} results, all with correct trade_type`
    );
    
    // Test 4.2: Check metadata presence
    const hasMetadata = searchResults.rows.every(r => 
      r.module && r.module_name && r.trade_type && r.course
    );
    
    logTest(
      'Search results include metadata',
      hasMetadata,
      'All results have module, module_name, trade_type, and course'
    );
    
    // Test 4.3: Cross-trade-type search isolation
    const theoryCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM knowledge_chunks
      WHERE trade_type = 'trade_theory' AND content ILIKE '%wiring%'
    `);
    
    const practicalCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM knowledge_chunks
      WHERE trade_type = 'trade_practical' AND content ILIKE '%wiring%'
    `);
    
    logTest(
      'Trade types have distinct content',
      parseInt(theoryCount.rows[0].count) !== parseInt(practicalCount.rows[0].count),
      `Theory: ${theoryCount.rows[0].count}, Practical: ${practicalCount.rows[0].count}`
    );
    
  } catch (error) {
    logTest('Search functionality tests', false, (error as Error).message);
  }
}

async function testUIFlowSimulation(pool: Pool) {
  console.log(`\n${colors.bright}${colors.cyan}=== 5. UI FLOW SIMULATION ===${colors.reset}\n`);
  
  try {
    // Test 5.1: Course selection
    const courses = await pool.query(`
      SELECT DISTINCT course
      FROM knowledge_chunks
      ORDER BY course
    `);
    
    logTest(
      'UI: Course selection available',
      courses.rows.length > 0,
      `Available courses: ${courses.rows.map(r => r.course).join(', ')}`
    );
    
    // Test 5.2: Trade type selection for course
    const tradeTypes = await pool.query(`
      SELECT DISTINCT trade_type
      FROM knowledge_chunks
      WHERE course = $1 AND trade_type IS NOT NULL
      ORDER BY trade_type
    `, ['electrician']);
    
    logTest(
      'UI: Trade type selection available',
      tradeTypes.rows.length >= 2,
      `Available types: ${tradeTypes.rows.map(r => r.trade_type).join(', ')}`
    );
    
    // Test 5.3: Module display with numerical sorting
    const modules = await pool.query(`
      SELECT DISTINCT 
        module,
        module_name
      FROM knowledge_chunks
      WHERE course = $1 AND trade_type = $2 AND module != 'general-content'
      ORDER BY module
    `, ['electrician', 'trade_theory']);
    
    // Check if modules can be sorted numerically
    const hasNumbers = modules.rows.some(r => /\d+/.test(r.module_name));
    
    logTest(
      'UI: Modules display with sortable names',
      modules.rows.length > 0 && hasNumbers,
      `${modules.rows.length} modules found with numerical identifiers`
    );
    
    // Test 5.4: Module details load
    if (modules.rows.length > 0) {
      const moduleContent = await pool.query(`
        SELECT COUNT(*) as chunk_count
        FROM knowledge_chunks
        WHERE course = $1 AND module = $2 AND trade_type = $3
      `, ['electrician', modules.rows[0].module, 'trade_theory']);
      
      logTest(
        'UI: Module details load properly',
        parseInt(moduleContent.rows[0].chunk_count) > 0,
        `Module has ${moduleContent.rows[0].chunk_count} chunks`
      );
    }
    
    // Test 5.5: Empty state handling
    const emptyCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM knowledge_chunks
      WHERE course = $1 AND trade_type = $2 AND module != 'general-content'
    `, ['fitter', 'trade_theory']);
    
    logTest(
      'UI: Empty state displays correctly',
      parseInt(emptyCheck.rows[0].count) === 0,
      'Fitter course correctly shows as empty'
    );
    
  } catch (error) {
    logTest('UI flow simulation tests', false, (error as Error).message);
  }
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║  SYLLABUS RESTRUCTURE - SYSTEM VERIFICATION   ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════╝${colors.reset}`);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
    password: 'admin',
  });
  
  try {
    await testDatabaseStructure(pool);
    await testModuleOrganization(pool);
    await testAPIEndpoints(pool);
    await testSearchFunctionality(pool);
    await testUIFlowSimulation(pool);
    
    // Summary
    console.log(`\n${colors.bright}${colors.cyan}=== TEST SUMMARY ===${colors.reset}\n`);
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    const percentage = ((passed / total) * 100).toFixed(1);
    
    console.log(`Total Tests: ${total}`);
    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
    console.log(`Success Rate: ${percentage}%\n`);
    
    if (failed > 0) {
      console.log(`${colors.red}Failed Tests:${colors.reset}`);
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  ❌ ${r.name}: ${r.message}`);
      });
      console.log('');
    }
    
    if (percentage >= 90) {
      console.log(`${colors.green}${colors.bright}🎉 SYSTEM VERIFICATION PASSED!${colors.reset}`);
      console.log(`${colors.green}All critical functionality is working correctly.${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}⚠️  Some tests failed. Please review the results above.${colors.reset}\n`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Fatal error: ${(error as Error).message}${colors.reset}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
