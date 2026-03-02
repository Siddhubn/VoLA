/**
 * Module Context Tracker
 * 
 * Tracks the current module context during PDF processing and associates
 * chunks with the appropriate module based on detected module headers.
 */

import {
  ModuleContext,
  ModuleHeader,
  detectModuleHeader,
  createModuleContext,
  getDefaultModuleContext,
  moduleContextToId,
} from './module-header-detector'

export interface ChunkWithModule {
  content: string
  module: string
  moduleName: string
  moduleNumber: number | null
  lineIndex: number
}

/**
 * Module Context Tracker
 * 
 * Maintains state of the current module context during processing
 * and associates content chunks with the appropriate module.
 */
export class ModuleContextTracker {
  private currentContext: ModuleContext
  private detectedHeaders: ModuleHeader[]
  private currentLineIndex: number
  
  constructor() {
    this.currentContext = getDefaultModuleContext()
    this.detectedHeaders = []
    this.currentLineIndex = 0
  }
  
  /**
   * Process a line of text and update context if a module header is detected
   * Returns true if a new module was detected
   */
  processLine(line: string, lineIndex: number): boolean {
    this.currentLineIndex = lineIndex
    
    const header = detectModuleHeader(line)
    if (header) {
      header.lineIndex = lineIndex
      this.detectedHeaders.push(header)
      this.currentContext = createModuleContext(header)
      return true
    }
    
    return false
  }
  
  /**
   * Get the current module context
   */
  getCurrentContext(): ModuleContext {
    return { ...this.currentContext }
  }
  
  /**
   * Get the current module ID
   */
  getCurrentModuleId(): string {
    return moduleContextToId(this.currentContext)
  }
  
  /**
   * Associate a chunk with the current module context
   */
  associateChunk(content: string, lineIndex: number): ChunkWithModule {
    return {
      content,
      module: this.getCurrentModuleId(),
      moduleName: this.currentContext.fullModuleName,
      moduleNumber: this.currentContext.moduleNumber,
      lineIndex,
    }
  }
  
  /**
   * Get all detected module headers
   */
  getDetectedHeaders(): ModuleHeader[] {
    return [...this.detectedHeaders]
  }
  
  /**
   * Reset the tracker to initial state
   */
  reset(): void {
    this.currentContext = getDefaultModuleContext()
    this.detectedHeaders = []
    this.currentLineIndex = 0
  }
  
  /**
   * Get statistics about detected modules
   */
  getStatistics(): {
    totalModules: number
    moduleNumbers: number[]
    hasDefaultContent: boolean
  } {
    const moduleNumbers = this.detectedHeaders
      .map(h => h.moduleNumber)
      .filter((num, idx, arr) => arr.indexOf(num) === idx)
      .sort((a, b) => a - b)
    
    return {
      totalModules: moduleNumbers.length,
      moduleNumbers,
      hasDefaultContent: this.currentContext.moduleNumber === null,
    }
  }
}

/**
 * Process text content and associate chunks with modules
 * 
 * This function processes text line by line, detecting module headers
 * and associating subsequent content with the detected module.
 */
export function processTextWithModuleContext(
  text: string,
  chunkSize: number = 1000
): ChunkWithModule[] {
  const tracker = new ModuleContextTracker()
  const lines = text.split('\n')
  const chunks: ChunkWithModule[] = []
  
  let currentChunkLines: string[] = []
  let currentChunkStartLine = 0
  let currentChunkSize = 0
  let previousContext: ModuleContext = getDefaultModuleContext()
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Check if this line is a module header
    const isModuleHeader = tracker.processLine(line, i)
    
    // If we hit a module header and have accumulated content, flush it with PREVIOUS context
    if (isModuleHeader && currentChunkLines.length > 0) {
      const chunkContent = currentChunkLines.join('\n')
      // Associate with the previous context (before this header)
      const moduleId = moduleContextToId(previousContext)
      chunks.push({
        content: chunkContent,
        module: moduleId,
        moduleName: previousContext.fullModuleName,
        moduleNumber: previousContext.moduleNumber,
        lineIndex: currentChunkStartLine,
      })
      
      currentChunkLines = []
      currentChunkStartLine = i + 1
      currentChunkSize = 0
    }
    
    // Update previous context after processing header
    if (isModuleHeader) {
      previousContext = tracker.getCurrentContext()
    }
    
    // Add line to current chunk (skip module headers themselves)
    if (!isModuleHeader && line.trim().length > 0) {
      currentChunkLines.push(line)
      currentChunkSize += line.length
      
      // If chunk is large enough, flush it
      if (currentChunkSize >= chunkSize) {
        const chunkContent = currentChunkLines.join('\n')
        chunks.push(tracker.associateChunk(chunkContent, currentChunkStartLine))
        
        currentChunkLines = []
        currentChunkStartLine = i + 1
        currentChunkSize = 0
      }
    }
  }
  
  // Flush any remaining content
  if (currentChunkLines.length > 0) {
    const chunkContent = currentChunkLines.join('\n')
    chunks.push(tracker.associateChunk(chunkContent, currentChunkStartLine))
  }
  
  return chunks
}

/**
 * Log a warning for chunks without a detected module
 */
export function logUndetectedModuleWarning(
  chunk: ChunkWithModule,
  filename: string
): void {
  if (chunk.moduleNumber === null) {
    console.warn(
      `⚠️  Chunk at line ${chunk.lineIndex} in ${filename} has no detected module. ` +
      `Assigned to "${chunk.moduleName}".`
    )
  }
}
