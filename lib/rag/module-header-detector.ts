/**
 * Module Header Detection
 * 
 * This module provides functionality to detect module headers in PDF content
 * and extract module numbers and names according to the specification.
 */

export interface ModuleHeader {
  moduleNumber: number
  moduleName: string
  fullHeader: string
  lineIndex: number
}

export interface ModuleContext {
  moduleNumber: number | null
  moduleName: string | null
  fullModuleName: string // "Module 1 - Safety Practice"
}

/**
 * Module header detection patterns as specified in the design document
 */
const MODULE_HEADER_PATTERNS = [
  // Pattern 1: Module \d+ - .+ (e.g., "Module 1 - Safety Practice")
  /^Module\s+(\d+)\s*-\s*(.+)$/i,
  
  // Pattern 2: Module \d+: .+ (e.g., "Module 1: Safety Practice")
  /^Module\s+(\d+)\s*:\s*(.+)$/i,
  
  // Pattern 3: MODULE \d+ .+ (case insensitive, space separator)
  /^Module\s+(\d+)\s+(.+)$/i,
]

/**
 * Detect if a line contains a module header
 * Returns the extracted module information if found, null otherwise
 */
export function detectModuleHeader(line: string): ModuleHeader | null {
  const trimmedLine = line.trim()
  
  for (const pattern of MODULE_HEADER_PATTERNS) {
    const match = trimmedLine.match(pattern)
    if (match) {
      const moduleNumber = parseInt(match[1], 10)
      const moduleName = match[2].trim()
      
      return {
        moduleNumber,
        moduleName,
        fullHeader: trimmedLine,
        lineIndex: 0, // Will be set by caller
      }
    }
  }
  
  return null
}

/**
 * Extract all module headers from text content
 * Returns an array of detected module headers with their line indices
 */
export function extractModuleHeaders(text: string): ModuleHeader[] {
  const lines = text.split('\n')
  const headers: ModuleHeader[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const header = detectModuleHeader(lines[i])
    if (header) {
      header.lineIndex = i
      headers.push(header)
    }
  }
  
  return headers
}

/**
 * Create a module context from a module header
 */
export function createModuleContext(header: ModuleHeader | null): ModuleContext {
  if (!header) {
    return {
      moduleNumber: null,
      moduleName: null,
      fullModuleName: 'General Content',
    }
  }
  
  return {
    moduleNumber: header.moduleNumber,
    moduleName: header.moduleName,
    fullModuleName: header.fullHeader,
  }
}

/**
 * Convert module context to a module ID slug
 * e.g., "Module 1 - Safety Practice" -> "module-1-safety-practice"
 */
export function moduleContextToId(context: ModuleContext): string {
  if (context.moduleNumber === null) {
    return 'general-content'
  }
  
  const namePart = context.moduleName
    ? context.moduleName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    : ''
  
  return `module-${context.moduleNumber}${namePart ? '-' + namePart : ''}`
}

/**
 * Get the default module context for content without a detected module
 */
export function getDefaultModuleContext(): ModuleContext {
  return {
    moduleNumber: null,
    moduleName: null,
    fullModuleName: 'General Content',
  }
}
