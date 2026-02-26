#!/usr/bin/env node

/**
 * PDF Batch Processing CLI Script
 * 
 * Processes all PDFs in fitter/ and electrician/ folders through the RAG pipeline.
 * Provides progress tracking, detailed reporting, and configurable options.
 * 
 * Usage:
 *   node scripts/process-pdfs.js [options]
 * 
 * Options:
 *   --chunk-size <number>        Chunk size in tokens (default: 750)
 *   --chunk-overlap <number>     Overlap between chunks (default: 100)
 *   --batch-size <number>        Embedding batch size (default: 50)
 *   --concurrent <number>        Max concurrent files (default: 2)
 *   --course <fitter|electrician> Process only specific course
 *   --dry-run                    Show what would be processed without processing
 *   --report-file <path>         Save detailed report to file
 *   --verbose                    Show detailed progress information
 *   --help                       Show this help message
 */

const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

// Import our pipeline (we'll need to compile TypeScript first)
let PDFProcessingPipeline;

// Configuration defaults
const DEFAULT_CONFIG = {
  chunkSize: 750,
  chunkOverlap: 100,
  embeddingBatchSize: 50,
  maxConcurrentFiles: 2,
  course: null, // Process both courses by default
  dryRun: false,
  reportFile: null,
  verbose: false
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Progress tracking
class ProgressTracker {
  constructor(totalFiles, verbose = false) {
    this.totalFiles = totalFiles;
    this.verbose = verbose;
    this.currentFile = 0;
    this.startTime = performance.now();
    this.fileProgress = new Map();
    this.completedFiles = [];
    this.failedFiles = [];
  }

  updateFileProgress(filename, progress) {
    this.fileProgress.set(filename, progress);
    
    if (this.verbose) {
      this.displayDetailedProgress(filename, progress);
    } else {
      this.displaySimpleProgress();
    }
  }

  completeFile(filename, result) {
    this.currentFile++;
    
    if (result.success) {
      this.completedFiles.push({ filename, result });
      console.log(`${colors.green}✅ Completed: ${filename}${colors.reset}`);
    } else {
      this.failedFiles.push({ filename, result });
      console.log(`${colors.red}❌ Failed: ${filename} - ${result.error}${colors.reset}`);
    }
    
    this.displayOverallProgress();
  }

  displayDetailedProgress(filename, progress) {
    const bar = this.createProgressBar(progress.progress, 30);
    const stage = progress.stage.padEnd(10);
    const message = progress.message.substring(0, 40).padEnd(40);
    
    console.log(`${colors.cyan}${filename}${colors.reset} [${stage}] ${bar} ${message}`);
    
    if (progress.chunksProcessed && progress.totalChunks) {
      console.log(`  └─ Chunks: ${progress.chunksProcessed}/${progress.totalChunks}`);
    }
  }

  displaySimpleProgress() {
    const completed = this.completedFiles.length;
    const failed = this.failedFiles.length;
    const inProgress = this.currentFile - completed - failed;
    
    console.log(`Progress: ${completed + failed}/${this.totalFiles} files processed (${completed} ✅, ${failed} ❌, ${inProgress} 🔄)`);
  }

  displayOverallProgress() {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const completed = this.completedFiles.length + this.failedFiles.length;
    const remaining = this.totalFiles - completed;
    
    let eta = 'calculating...';
    if (completed > 0) {
      const avgTimePerFile = elapsed / completed;
      const etaSeconds = avgTimePerFile * remaining;
      eta = this.formatDuration(etaSeconds);
    }
    
    const overallBar = this.createProgressBar((completed / this.totalFiles) * 100, 50);
    
    console.log(`\n${colors.bright}Overall Progress:${colors.reset}`);
    console.log(`${overallBar} ${completed}/${this.totalFiles}`);
    console.log(`Elapsed: ${this.formatDuration(elapsed)} | ETA: ${eta}\n`);
  }

  createProgressBar(percentage, width = 30) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${colors.green}${bar}${colors.reset} ${percentage.toFixed(1)}%`;
  }

  formatDuration(seconds) {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  getSummary() {
    const elapsed = (performance.now() - this.startTime) / 1000;
    
    return {
      totalFiles: this.totalFiles,
      completedFiles: this.completedFiles.length,
      failedFiles: this.failedFiles.length,
      totalProcessingTime: elapsed,
      averageTimePerFile: this.completedFiles.length > 0 ? elapsed / this.completedFiles.length : 0,
      successRate: (this.completedFiles.length / this.totalFiles) * 100,
      results: [...this.completedFiles, ...this.failedFiles]
    };
  }
}

// Report generator
class ReportGenerator {
  constructor() {
    this.startTime = new Date();
  }

  generateReport(summary, config) {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        processingStarted: this.startTime.toISOString(),
        processingCompleted: new Date().toISOString(),
        totalDuration: summary.totalProcessingTime,
        configuration: config
      },
      summary: {
        totalFiles: summary.totalFiles,
        successfulFiles: summary.completedFiles,
        failedFiles: summary.failedFiles,
        successRate: summary.successRate,
        averageProcessingTime: summary.averageTimePerFile
      },
      statistics: this.calculateStatistics(summary.results),
      fileResults: summary.results.map(({ filename, result }) => ({
        filename,
        success: result.success,
        course: result.course,
        processingTimeMs: result.processingTimeMs,
        totalChunks: result.totalChunks,
        totalEmbeddings: result.totalEmbeddings,
        error: result.error,
        summary: result.summary
      })),
      errors: summary.results
        .filter(({ result }) => !result.success)
        .map(({ filename, result }) => ({
          filename,
          error: result.error,
          course: result.course
        }))
    };

    return report;
  }

  calculateStatistics(results) {
    const successful = results.filter(({ result }) => result.success);
    
    if (successful.length === 0) {
      return {
        totalChunks: 0,
        totalEmbeddings: 0,
        totalTokens: 0,
        averageChunksPerFile: 0,
        averageTokensPerChunk: 0,
        moduleDistribution: {},
        courseDistribution: {}
      };
    }

    let totalChunks = 0;
    let totalEmbeddings = 0;
    let totalTokens = 0;
    const moduleDistribution = {};
    const courseDistribution = {};

    successful.forEach(({ result }) => {
      totalChunks += result.totalChunks;
      totalEmbeddings += result.totalEmbeddings;
      
      if (result.summary) {
        totalTokens += result.summary.totalTokens;
        
        // Aggregate module distribution
        Object.entries(result.summary.moduleDistribution).forEach(([module, count]) => {
          moduleDistribution[module] = (moduleDistribution[module] || 0) + count;
        });
      }
      
      // Course distribution
      courseDistribution[result.course] = (courseDistribution[result.course] || 0) + 1;
    });

    return {
      totalChunks,
      totalEmbeddings,
      totalTokens,
      averageChunksPerFile: totalChunks / successful.length,
      averageTokensPerChunk: totalTokens > 0 ? totalTokens / totalChunks : 0,
      moduleDistribution,
      courseDistribution
    };
  }

  async saveReport(report, filePath) {
    const reportContent = JSON.stringify(report, null, 2);
    await fs.writeFile(filePath, reportContent, 'utf8');
    
    // Also generate a human-readable summary
    const summaryPath = filePath.replace('.json', '-summary.txt');
    const summaryContent = this.generateHumanReadableSummary(report);
    await fs.writeFile(summaryPath, summaryContent, 'utf8');
    
    return { reportPath: filePath, summaryPath };
  }

  generateHumanReadableSummary(report) {
    const { metadata, summary, statistics, errors } = report;
    
    let content = `PDF Processing Report\n`;
    content += `===================\n\n`;
    
    content += `Generated: ${new Date(metadata.generatedAt).toLocaleString()}\n`;
    content += `Duration: ${this.formatDuration(metadata.totalDuration)}\n\n`;
    
    content += `Summary:\n`;
    content += `--------\n`;
    content += `Total Files: ${summary.totalFiles}\n`;
    content += `Successful: ${summary.successfulFiles} (${summary.successRate.toFixed(1)}%)\n`;
    content += `Failed: ${summary.failedFiles}\n`;
    content += `Avg Processing Time: ${this.formatDuration(summary.averageProcessingTime)}\n\n`;
    
    content += `Statistics:\n`;
    content += `-----------\n`;
    content += `Total Chunks: ${statistics.totalChunks.toLocaleString()}\n`;
    content += `Total Embeddings: ${statistics.totalEmbeddings.toLocaleString()}\n`;
    content += `Total Tokens: ${statistics.totalTokens.toLocaleString()}\n`;
    content += `Avg Chunks/File: ${statistics.averageChunksPerFile.toFixed(1)}\n`;
    content += `Avg Tokens/Chunk: ${statistics.averageTokensPerChunk.toFixed(1)}\n\n`;
    
    if (Object.keys(statistics.moduleDistribution).length > 0) {
      content += `Module Distribution:\n`;
      content += `-------------------\n`;
      Object.entries(statistics.moduleDistribution)
        .sort(([,a], [,b]) => b - a)
        .forEach(([module, count]) => {
          content += `${module}: ${count} chunks\n`;
        });
      content += `\n`;
    }
    
    if (errors.length > 0) {
      content += `Errors:\n`;
      content += `-------\n`;
      errors.forEach(({ filename, error, course }) => {
        content += `${filename} (${course}): ${error}\n`;
      });
    }
    
    return content;
  }

  formatDuration(seconds) {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }
}

// File discovery
async function discoverPDFs(baseDir, course = null) {
  const files = [];
  const courses = course ? [course] : ['fitter', 'electrician'];
  
  for (const courseName of courses) {
    const courseDir = path.join(baseDir, courseName);
    
    try {
      const entries = await fs.readdir(courseDir);
      
      for (const entry of entries) {
        if (entry.toLowerCase().endsWith('.pdf')) {
          const filePath = path.join(courseDir, entry);
          const stats = await fs.stat(filePath);
          
          files.push({
            path: filePath,
            course: courseName,
            filename: entry,
            size: stats.size,
            relativePath: path.join(courseName, entry)
          });
        }
      }
    } catch (error) {
      console.warn(`${colors.yellow}⚠️ Could not read ${courseName} directory: ${error.message}${colors.reset}`);
    }
  }
  
  return files;
}

// Command line argument parsing
function parseArguments() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--chunk-size':
        config.chunkSize = parseInt(args[++i]);
        break;
      case '--chunk-overlap':
        config.chunkOverlap = parseInt(args[++i]);
        break;
      case '--batch-size':
        config.embeddingBatchSize = parseInt(args[++i]);
        break;
      case '--concurrent':
        config.maxConcurrentFiles = parseInt(args[++i]);
        break;
      case '--course':
        config.course = args[++i];
        if (!['fitter', 'electrician'].includes(config.course)) {
          console.error(`${colors.red}Error: Course must be 'fitter' or 'electrician'${colors.reset}`);
          process.exit(1);
        }
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--report-file':
        config.reportFile = args[++i];
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
      default:
        console.error(`${colors.red}Unknown option: ${arg}${colors.reset}`);
        console.log('Use --help for usage information');
        process.exit(1);
    }
  }
  
  return config;
}

function showHelp() {
  console.log(`
${colors.bright}PDF Batch Processing CLI${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node scripts/process-pdfs.js [options]

${colors.cyan}Options:${colors.reset}
  --chunk-size <number>        Chunk size in tokens (default: 750)
  --chunk-overlap <number>     Overlap between chunks (default: 100)
  --batch-size <number>        Embedding batch size (default: 50)
  --concurrent <number>        Max concurrent files (default: 2)
  --course <fitter|electrician> Process only specific course
  --dry-run                    Show what would be processed without processing
  --report-file <path>         Save detailed report to file
  --verbose                    Show detailed progress information
  --help                       Show this help message

${colors.cyan}Examples:${colors.reset}
  # Process all PDFs with default settings
  node scripts/process-pdfs.js

  # Process only fitter course with custom chunk size
  node scripts/process-pdfs.js --course fitter --chunk-size 1000

  # Dry run to see what would be processed
  node scripts/process-pdfs.js --dry-run

  # Process with detailed progress and save report
  node scripts/process-pdfs.js --verbose --report-file processing-report.json
`);
}

// Main processing function
async function main() {
  console.log(`${colors.bright}${colors.blue}🚀 PDF Batch Processing CLI${colors.reset}\n`);
  
  try {
    // Parse command line arguments
    const config = parseArguments();
    
    // Validate environment
    if (!process.env.GEMINI_API_KEY) {
      console.error(`${colors.red}❌ Error: GEMINI_API_KEY environment variable is required${colors.reset}`);
      process.exit(1);
    }
    
    // Import the pipeline (assuming TypeScript is compiled)
    try {
      const pipelineModule = require('../lib/rag/pdf-pipeline');
      PDFProcessingPipeline = pipelineModule.PDFProcessingPipeline;
    } catch (error) {
      console.error(`${colors.red}❌ Error: Could not import PDF pipeline. Make sure TypeScript is compiled.${colors.reset}`);
      console.error(`Run: npm run build or compile TypeScript files first`);
      process.exit(1);
    }
    
    // Discover PDF files
    const baseDir = process.cwd();
    console.log(`${colors.cyan}📁 Discovering PDF files...${colors.reset}`);
    
    const files = await discoverPDFs(baseDir, config.course);
    
    if (files.length === 0) {
      console.log(`${colors.yellow}⚠️ No PDF files found to process${colors.reset}`);
      return;
    }
    
    // Display discovered files
    console.log(`\n${colors.bright}Found ${files.length} PDF files:${colors.reset}`);
    files.forEach(file => {
      const sizeKB = (file.size / 1024).toFixed(1);
      console.log(`  ${colors.green}•${colors.reset} ${file.relativePath} (${sizeKB} KB)`);
    });
    
    // Show configuration
    console.log(`\n${colors.bright}Configuration:${colors.reset}`);
    console.log(`  Chunk Size: ${config.chunkSize} tokens`);
    console.log(`  Chunk Overlap: ${config.chunkOverlap} tokens`);
    console.log(`  Embedding Batch Size: ${config.embeddingBatchSize}`);
    console.log(`  Max Concurrent Files: ${config.maxConcurrentFiles}`);
    console.log(`  Verbose Mode: ${config.verbose ? 'enabled' : 'disabled'}`);
    
    if (config.dryRun) {
      console.log(`\n${colors.yellow}🔍 Dry run mode - no actual processing will occur${colors.reset}`);
      return;
    }
    
    // Initialize progress tracking and reporting
    const progressTracker = new ProgressTracker(files.length, config.verbose);
    const reportGenerator = new ReportGenerator();
    
    // Create pipeline with progress callback
    const pipeline = new PDFProcessingPipeline({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
      embeddingBatchSize: config.embeddingBatchSize,
      maxConcurrentFiles: config.maxConcurrentFiles,
      progressCallback: (progress) => {
        progressTracker.updateFileProgress(progress.filename, progress);
      }
    });
    
    console.log(`\n${colors.bright}🔄 Starting batch processing...${colors.reset}\n`);
    
    // Process files
    const fileInputs = files.map(file => ({
      path: file.path,
      course: file.course
    }));
    
    const results = await pipeline.processBatch(fileInputs);
    
    // Update progress tracker with results
    results.forEach((result, index) => {
      const filename = files[index].filename;
      progressTracker.completeFile(filename, result);
    });
    
    // Generate final summary
    const summary = progressTracker.getSummary();
    
    console.log(`\n${colors.bright}📊 Processing Complete!${colors.reset}\n`);
    console.log(`${colors.green}✅ Successful: ${summary.completedFiles}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${summary.failedFiles}${colors.reset}`);
    console.log(`⏱️ Total Time: ${progressTracker.formatDuration(summary.totalProcessingTime)}`);
    console.log(`📈 Success Rate: ${summary.successRate.toFixed(1)}%`);
    
    // Generate and save report if requested
    if (config.reportFile) {
      console.log(`\n${colors.cyan}📄 Generating detailed report...${colors.reset}`);
      
      const report = reportGenerator.generateReport(summary, config);
      const { reportPath, summaryPath } = await reportGenerator.saveReport(report, config.reportFile);
      
      console.log(`${colors.green}✅ Report saved to: ${reportPath}${colors.reset}`);
      console.log(`${colors.green}✅ Summary saved to: ${summaryPath}${colors.reset}`);
    }
    
    // Exit with appropriate code
    process.exit(summary.failedFiles > 0 ? 1 : 0);
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Fatal error: ${error.message}${colors.reset}`);
    if (config && config.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}⚠️ Processing interrupted by user${colors.reset}`);
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log(`\n${colors.yellow}⚠️ Processing terminated${colors.reset}`);
  process.exit(143);
});

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}❌ Unhandled error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  discoverPDFs,
  ProgressTracker,
  ReportGenerator,
  parseArguments,
  main
};