#!/usr/bin/env tsx

/**
 * PDF Batch Processing CLI Script (TypeScript)
 * 
 * Processes all PDFs in fitter/ and electrician/ folders through the RAG pipeline.
 * Provides progress tracking, detailed reporting, and configurable options.
 * 
 * Usage:
 *   npx tsx scripts/process-pdfs.ts [options]
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

import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

// Dynamic imports to avoid database connection issues in dry-run mode
let PDFProcessingPipeline: any;
let ProcessingResult: any;
let ProcessingProgress: any;

// Configuration interface
interface CLIConfig {
  chunkSize: number;
  chunkOverlap: number;
  embeddingBatchSize: number;
  maxConcurrentFiles: number;
  course: 'fitter' | 'electrician' | null;
  dryRun: boolean;
  reportFile: string | null;
  verbose: boolean;
}

// Configuration defaults
const DEFAULT_CONFIG: CLIConfig = {
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
} as const;

// File information interface
interface PDFFileInfo {
  path: string;
  course: 'fitter' | 'electrician';
  filename: string;
  size: number;
  relativePath: string;
}

// Progress tracking class
class ProgressTracker {
  private totalFiles: number;
  private verbose: boolean;
  private currentFile: number = 0;
  private startTime: number;
  private fileProgress = new Map<string, ProcessingProgress>();
  private completedFiles: Array<{ filename: string; result: ProcessingResult }> = [];
  private failedFiles: Array<{ filename: string; result: ProcessingResult }> = [];

  constructor(totalFiles: number, verbose: boolean = false) {
    this.totalFiles = totalFiles;
    this.verbose = verbose;
    this.startTime = performance.now();
  }

  updateFileProgress(filename: string, progress: ProcessingProgress): void {
    this.fileProgress.set(filename, progress);
    
    if (this.verbose) {
      this.displayDetailedProgress(filename, progress);
    } else {
      this.displaySimpleProgress();
    }
  }

  completeFile(filename: string, result: ProcessingResult): void {
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

  private displayDetailedProgress(filename: string, progress: ProcessingProgress): void {
    const bar = this.createProgressBar(progress.progress, 30);
    const stage = progress.stage.padEnd(10);
    const message = progress.message.substring(0, 40).padEnd(40);
    
    console.log(`${colors.cyan}${filename}${colors.reset} [${stage}] ${bar} ${message}`);
    
    if (progress.chunksProcessed && progress.totalChunks) {
      console.log(`  └─ Chunks: ${progress.chunksProcessed}/${progress.totalChunks}`);
    }
  }

  private displaySimpleProgress(): void {
    const completed = this.completedFiles.length;
    const failed = this.failedFiles.length;
    const inProgress = this.currentFile - completed - failed;
    
    console.log(`Progress: ${completed + failed}/${this.totalFiles} files processed (${completed} ✅, ${failed} ❌, ${inProgress} 🔄)`);
  }

  private displayOverallProgress(): void {
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

  private createProgressBar(percentage: number, width: number = 30): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${colors.green}${bar}${colors.reset} ${percentage.toFixed(1)}%`;
  }

  formatDuration(seconds: number): string {
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

// Report generator class
class ReportGenerator {
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
  }

  generateReport(summary: ReturnType<ProgressTracker['getSummary']>, config: CLIConfig) {
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

  private calculateStatistics(results: Array<{ filename: string; result: ProcessingResult }>) {
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
    const moduleDistribution: Record<string, number> = {};
    const courseDistribution: Record<string, number> = {};

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

  async saveReport(report: any, filePath: string) {
    const reportContent = JSON.stringify(report, null, 2);
    await fs.writeFile(filePath, reportContent, 'utf8');
    
    // Also generate a human-readable summary
    const summaryPath = filePath.replace('.json', '-summary.txt');
    const summaryContent = this.generateHumanReadableSummary(report);
    await fs.writeFile(summaryPath, summaryContent, 'utf8');
    
    return { reportPath: filePath, summaryPath };
  }

  private generateHumanReadableSummary(report: any): string {
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
      content += `Module Distribution by Trade Type:\n`;
      content += `----------------------------------\n`;
      
      // Group by trade type
      const byTradeType: Record<string, Array<[string, number]>> = {}
      Object.entries(statistics.moduleDistribution).forEach(([key, count]) => {
        const [tradeType, ...moduleParts] = key.split(':')
        const moduleName = moduleParts.join(':')
        if (!byTradeType[tradeType]) {
          byTradeType[tradeType] = []
        }
        byTradeType[tradeType].push([moduleName, count as number])
      })
      
      // Display by trade type
      Object.entries(byTradeType).forEach(([tradeType, modules]) => {
        content += `\n${tradeType.toUpperCase()}:\n`
        modules
          .sort(([,a], [,b]) => b - a)
          .forEach(([module, count]) => {
            content += `  ${module}: ${count} chunks\n`
          })
      })
      content += `\n`;
    }
    
    if (errors.length > 0) {
      content += `Errors:\n`;
      content += `-------\n`;
      errors.forEach(({ filename, error, course }: any) => {
        content += `${filename} (${course}): ${error}\n`;
      });
    }
    
    return content;
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }
}

// File discovery function
async function discoverPDFs(baseDir: string, course: 'fitter' | 'electrician' | null = null): Promise<PDFFileInfo[]> {
  const files: PDFFileInfo[] = [];
  const courses = course ? [course] : ['fitter', 'electrician'] as const;
  
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
      console.warn(`${colors.yellow}⚠️ Could not read ${courseName} directory: ${(error as Error).message}${colors.reset}`);
    }
  }
  
  return files;
}

// Command line argument parsing
function parseArguments(): CLIConfig {
  const args = process.argv.slice(2);
  const config: CLIConfig = { ...DEFAULT_CONFIG };
  
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
        const courseArg = args[++i];
        if (!['fitter', 'electrician'].includes(courseArg)) {
          console.error(`${colors.red}Error: Course must be 'fitter' or 'electrician'${colors.reset}`);
          process.exit(1);
        }
        config.course = courseArg as 'fitter' | 'electrician';
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

function showHelp(): void {
  console.log(`
${colors.bright}PDF Batch Processing CLI${colors.reset}

${colors.cyan}Usage:${colors.reset}
  npx tsx scripts/process-pdfs.ts [options]

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
  npx tsx scripts/process-pdfs.ts

  # Process only fitter course with custom chunk size
  npx tsx scripts/process-pdfs.ts --course fitter --chunk-size 1000

  # Dry run to see what would be processed
  npx tsx scripts/process-pdfs.ts --dry-run

  # Process with detailed progress and save report
  npx tsx scripts/process-pdfs.ts --verbose --report-file processing-report.json
`);
}

// Main processing function
async function main(): Promise<void> {
  console.log(`${colors.bright}${colors.blue}🚀 PDF Batch Processing CLI${colors.reset}\n`);
  
  try {
    // Parse command line arguments
    const config = parseArguments();
    
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
    console.log(`  ${colors.cyan}Embedding Model: Local (HuggingFace all-MiniLM-L6-v2)${colors.reset}`);
    
    if (config.dryRun) {
      console.log(`\n${colors.yellow}🔍 Dry run mode - no actual processing will occur${colors.reset}`);
      console.log(`\n${colors.bright}Would process:${colors.reset}`);
      files.forEach(file => {
        console.log(`  ${colors.cyan}→${colors.reset} ${file.relativePath} (${file.course} course)`);
      });
      console.log(`\n${colors.green}✅ Dry run complete - ${files.length} files would be processed${colors.reset}`);
      return;
    }
    
    // Note: Using local embeddings - no API key required!
    console.log(`\n${colors.cyan}ℹ️  Using LOCAL embedding model (no API costs!)${colors.reset}`);
    
    // Import pipeline modules (only when actually processing)
    try {
      const pipelineModule = await import('../lib/rag/pdf-pipeline');
      PDFProcessingPipeline = pipelineModule.PDFProcessingPipeline;
    } catch (error) {
      console.error(`${colors.red}❌ Error: Could not import PDF pipeline modules${colors.reset}`);
      console.error(`Make sure the database is running and environment variables are set`);
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
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
      progressCallback: (progress: any) => {
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
    results.forEach((result: any, index: number) => {
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
    
    // Display statistics by course, trade_type, and module
    const report = reportGenerator.generateReport(summary, config);
    if (Object.keys(report.statistics.moduleDistribution).length > 0) {
      console.log(`\n${colors.bright}📚 Module Distribution by Trade Type:${colors.reset}`);
      
      // Group by trade type
      const byTradeType: Record<string, Array<[string, number]>> = {}
      Object.entries(report.statistics.moduleDistribution).forEach(([key, count]) => {
        const [tradeType, ...moduleParts] = key.split(':')
        const moduleName = moduleParts.join(':')
        if (!byTradeType[tradeType]) {
          byTradeType[tradeType] = []
        }
        byTradeType[tradeType].push([moduleName, count as number])
      })
      
      // Display by trade type
      Object.entries(byTradeType).forEach(([tradeType, modules]) => {
        console.log(`\n${colors.cyan}${tradeType.toUpperCase()}:${colors.reset}`)
        modules
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10) // Show top 10 modules per trade type
          .forEach(([module, count]) => {
            console.log(`  ${colors.green}•${colors.reset} ${module}: ${count} chunks`)
          })
        if (modules.length > 10) {
          console.log(`  ${colors.yellow}... and ${modules.length - 10} more modules${colors.reset}`)
        }
      })
    }
    
    // Generate and save report if requested
    if (config.reportFile) {
      console.log(`\n${colors.cyan}📄 Generating detailed report...${colors.reset}`);
      
      try {
        const { reportPath, summaryPath } = await reportGenerator.saveReport(report, config.reportFile);
        
        console.log(`${colors.green}✅ Report saved to: ${reportPath}${colors.reset}`);
        console.log(`${colors.green}✅ Summary saved to: ${summaryPath}${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}❌ Failed to save report: ${(error as Error).message}${colors.reset}`);
        console.error(`${colors.yellow}⚠️  Continuing despite report save failure${colors.reset}`);
      }
    }
    
    // Exit with appropriate code
    process.exit(summary.failedFiles > 0 ? 1 : 0);
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Fatal error: ${(error as Error).message}${colors.reset}`);
    if (config && config.verbose) {
      console.error((error as Error).stack);
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
    console.error(`${colors.red}❌ Unhandled error: ${(error as Error).message}${colors.reset}`);
    process.exit(1);
  });
}

export {
  discoverPDFs,
  ProgressTracker,
  ReportGenerator,
  parseArguments,
  main
};