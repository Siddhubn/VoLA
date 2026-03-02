#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { IndexExtractor } from '../lib/rag/index-extractor';
import { SyllabusStructureStorage } from '../lib/rag/syllabus-storage';

config({ path: path.join(process.cwd(), '.env.local') });

async function extractSyllabusFromPDFs() {
  const extractor = new IndexExtractor();
  const storage = new SyllabusStructureStorage();

  try {
    console.log('📚 Extracting syllabus structure from PDFs...\n');

    const courses = ['electrician', 'fitter'];
    let totalModules = 0;
    let totalTopics = 0;

    for (const course of courses) {
      const courseDir = path.join(process.cwd(), course);
      
      if (!fs.existsSync(courseDir)) {
        console.log(`⏭️  Skipping ${course} (directory not found)\n`);
        continue;
      }

      const files = fs.readdirSync(courseDir).filter(f => f.endsWith('.pdf'));
      
      if (files.length === 0) {
        console.log(`⏭️  No PDFs found in ${course}\n`);
        continue;
      }

      console.log(`📖 Processing ${course} (${files.length} PDFs):`);

      for (const file of files) {
        const pdfPath = path.join(courseDir, file);
        
        // Detect trade type from filename
        const tradeType = file.includes('_TT') || file.includes('TT') 
          ? 'trade_theory' 
          : file.includes('_TP') || file.includes('TP')
          ? 'trade_practical'
          : 'trade_theory';

        const tradeLabel = tradeType === 'trade_theory' ? 'Theory' : 'Practical';
        
        console.log(`\n  📄 ${file} (${tradeLabel})`);

        try {
          // Extract index structure
          const modules = await extractor.extractFromPDF(pdfPath);

          if (modules.length === 0) {
            console.log('  ⚠️  No modules extracted');
            continue;
          }

          // Store in database
          await storage.storeSyllabusStructure(course, tradeType, modules);

          const topicCount = modules.reduce((sum, m) => sum + m.topics.length, 0);
          totalModules += modules.length;
          totalTopics += topicCount;

          console.log(`  ✅ Stored ${modules.length} modules, ${topicCount} topics`);

          // Show sample
          if (modules.length > 0) {
            const sample = modules[0];
            console.log(`  📋 Sample: ${sample.moduleName}`);
            if (sample.topics.length > 0) {
              console.log(`     • ${sample.topics[0]}`);
              if (sample.topics.length > 1) {
                console.log(`     • ${sample.topics[1]}`);
              }
              if (sample.topics.length > 2) {
                console.log(`     ... and ${sample.topics.length - 2} more topics`);
              }
            }
          }
        } catch (error) {
          console.error(`  ❌ Error processing ${file}:`, (error as Error).message);
        }
      }

      console.log('');
    }

    // Show statistics
    console.log('\n📊 Extraction Summary:');
    const stats = await storage.getStatistics();
    
    if (stats.length === 0) {
      console.log('  No data extracted');
    } else {
      for (const stat of stats) {
        const tradeLabel = stat.trade_type === 'trade_theory' ? 'Theory' : 'Practical';
        console.log(`  ${stat.course} - ${tradeLabel}:`);
        console.log(`    Modules: ${stat.module_count}`);
        console.log(`    Topics: ${stat.total_topics}`);
      }
    }

    console.log(`\n✅ Total: ${totalModules} modules, ${totalTopics} topics extracted`);

    await storage.close();
  } catch (error) {
    console.error('❌ Fatal error:', (error as Error).message);
    process.exit(1);
  }
}

extractSyllabusFromPDFs();
