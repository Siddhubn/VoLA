import { ModuleMapping } from './rag-db'

export interface ModuleInfo {
  moduleId: string
  moduleName: string
  confidence: number
  startIndex: number
  endIndex?: number
}

export interface ModuleDetectionResult {
  detectedModules: ModuleInfo[]
  unmappedSections: Array<{
    content: string
    startIndex: number
    endIndex: number
  }>
}

// Predefined module mappings for ITI courses
export const FITTER_MODULES: ModuleMapping[] = [
  {
    course: 'fitter',
    module_id: 'safety-practices',
    module_name: 'Safety Practices',
    keywords: ['safety', 'hazard', 'ppe', 'personal protective equipment', 'accident', 'first aid', 'emergency'],
    description: 'Workplace safety, hazard identification, and emergency procedures',
    display_order: 1
  },
  {
    course: 'fitter',
    module_id: 'hand-tools',
    module_name: 'Hand Tools and Measuring Instruments',
    keywords: ['hand tools', 'measuring', 'caliper', 'micrometer', 'gauge', 'ruler', 'hammer', 'chisel'],
    description: 'Basic hand tools and precision measuring instruments',
    display_order: 2
  },
  {
    course: 'fitter',
    module_id: 'marking-cutting',
    module_name: 'Marking and Cutting',
    keywords: ['marking', 'cutting', 'scriber', 'punch', 'hacksaw', 'file', 'drilling', 'reaming'],
    description: 'Marking out and cutting operations on metal',
    display_order: 3
  },
  {
    course: 'fitter',
    module_id: 'fitting-assembly',
    module_name: 'Fitting and Assembly',
    keywords: ['fitting', 'assembly', 'joint', 'rivet', 'bolt', 'nut', 'thread', 'tap', 'die'],
    description: 'Fitting operations and mechanical assembly techniques',
    display_order: 4
  },
  {
    course: 'fitter',
    module_id: 'machine-tools',
    module_name: 'Machine Tools Operation',
    keywords: ['lathe', 'milling', 'drilling machine', 'grinder', 'shaper', 'planer', 'machining'],
    description: 'Operation of various machine tools',
    display_order: 5
  },
  {
    course: 'fitter',
    module_id: 'maintenance',
    module_name: 'Maintenance and Repair',
    keywords: ['maintenance', 'repair', 'troubleshooting', 'preventive', 'breakdown', 'lubrication'],
    description: 'Equipment maintenance and repair procedures',
    display_order: 6
  }
]

export const ELECTRICIAN_MODULES: ModuleMapping[] = [
  {
    course: 'electrician',
    module_id: 'electrical-safety',
    module_name: 'Electrical Safety',
    keywords: ['electrical safety', 'shock', 'electrocution', 'earthing', 'grounding', 'isolation', 'lockout'],
    description: 'Electrical safety practices and procedures',
    display_order: 1
  },
  {
    course: 'electrician',
    module_id: 'basic-electricity',
    module_name: 'Basic Electricity',
    keywords: ['voltage', 'current', 'resistance', 'ohm', 'circuit', 'conductor', 'insulator', 'semiconductor'],
    description: 'Fundamental electrical concepts and principles',
    display_order: 2
  },
  {
    course: 'electrician',
    module_id: 'electrical-instruments',
    module_name: 'Electrical Measuring Instruments',
    keywords: ['multimeter', 'ammeter', 'voltmeter', 'wattmeter', 'oscilloscope', 'clamp meter', 'megger'],
    description: 'Electrical measuring instruments and their applications',
    display_order: 3
  },
  {
    course: 'electrician',
    module_id: 'wiring-installation',
    module_name: 'Wiring and Installation',
    keywords: ['wiring', 'installation', 'conduit', 'cable', 'switch', 'socket', 'distribution board'],
    description: 'Electrical wiring methods and installation practices',
    display_order: 4
  },
  {
    course: 'electrician',
    module_id: 'motors-generators',
    module_name: 'Motors and Generators',
    keywords: ['motor', 'generator', 'induction', 'synchronous', 'dc motor', 'ac motor', 'starter'],
    description: 'Electric motors and generators operation and maintenance',
    display_order: 5
  },
  {
    course: 'electrician',
    module_id: 'power-systems',
    module_name: 'Power Systems',
    keywords: ['transformer', 'transmission', 'distribution', 'substation', 'protection', 'relay'],
    description: 'Power generation, transmission and distribution systems',
    display_order: 6
  }
]

export class ModuleDetector {
  private moduleMap: Map<string, ModuleMapping[]>

  constructor() {
    this.moduleMap = new Map()
    this.moduleMap.set('fitter', FITTER_MODULES)
    this.moduleMap.set('electrician', ELECTRICIAN_MODULES)
  }

  /**
   * Detect module boundaries in text content
   */
  detectModules(text: string, course: 'fitter' | 'electrician'): ModuleDetectionResult {
    const modules = this.moduleMap.get(course) || []
    const lines = text.split('\n')
    const detectedModules: ModuleInfo[] = []
    const unmappedSections: Array<{ content: string; startIndex: number; endIndex: number }> = []

    // First pass: detect explicit module headers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Check for module header patterns
      const moduleMatch = this.matchModuleHeader(line, modules)
      if (moduleMatch) {
        detectedModules.push({
          moduleId: moduleMatch.module_id,
          moduleName: moduleMatch.module_name,
          confidence: 0.9,
          startIndex: i
        })
      }
    }

    // Second pass: use content-based matching for sections without explicit headers
    if (detectedModules.length === 0) {
      // If no explicit modules found, use content-based detection
      const contentBasedModules = this.detectModulesByContent(text, modules)
      detectedModules.push(...contentBasedModules)
    }

    // Set end indices for detected modules
    for (let i = 0; i < detectedModules.length; i++) {
      if (i < detectedModules.length - 1) {
        detectedModules[i].endIndex = detectedModules[i + 1].startIndex
      } else {
        detectedModules[i].endIndex = lines.length
      }
    }

    return {
      detectedModules,
      unmappedSections
    }
  }

  /**
   * Match a line against known module header patterns
   */
  private matchModuleHeader(line: string, modules: ModuleMapping[]): ModuleMapping | null {
    const normalizedLine = line.toLowerCase()

    // Check for explicit module patterns
    const modulePatterns = [
      /^(?:module|chapter|unit|section)\s+(\d+)[:\s]*(.+)$/i,
      /^(\d+)\.\s*(.+)$/,
      /^([A-Z][A-Z\s]+)$/  // ALL CAPS headings
    ]

    for (const pattern of modulePatterns) {
      const match = line.match(pattern)
      if (match) {
        const headerText = match[2] || match[1] || line
        
        // Try to match against module names and keywords
        for (const module of modules) {
          if (this.fuzzyMatch(headerText, module.module_name, 0.7) ||
              this.keywordMatch(headerText, module.keywords || [])) {
            return module
          }
        }
      }
    }

    return null
  }

  /**
   * Detect modules based on content analysis
   */
  private detectModulesByContent(text: string, modules: ModuleMapping[]): ModuleInfo[] {
    const detectedModules: ModuleInfo[] = []
    const chunks = this.splitIntoChunks(text, 1000) // Split into ~1000 char chunks

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const scores = modules.map(module => ({
        module,
        score: this.calculateContentScore(chunk.content, module)
      }))

      // Find the best matching module
      const bestMatch = scores.reduce((best, current) => 
        current.score > best.score ? current : best
      )

      if (bestMatch.score > 0.3) { // Minimum confidence threshold
        detectedModules.push({
          moduleId: bestMatch.module.module_id,
          moduleName: bestMatch.module.module_name,
          confidence: bestMatch.score,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex
        })
      }
    }

    // Merge adjacent chunks with the same module
    return this.mergeAdjacentModules(detectedModules)
  }

  /**
   * Calculate content-based score for a module
   */
  private calculateContentScore(content: string, module: ModuleMapping): number {
    const keywords = module.keywords || []
    if (keywords.length === 0) return 0

    const normalizedContent = content.toLowerCase()
    let matchCount = 0
    let totalWeight = 0

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase()
      const weight = keyword.length > 10 ? 2 : 1 // Longer keywords get more weight
      
      if (normalizedContent.includes(keywordLower)) {
        matchCount += weight
      }
      totalWeight += weight
    }

    return matchCount / totalWeight
  }

  /**
   * Fuzzy string matching
   */
  private fuzzyMatch(str1: string, str2: string, threshold: number): boolean {
    const similarity = this.calculateSimilarity(str1.toLowerCase(), str2.toLowerCase())
    return similarity >= threshold
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = []
    const len1 = str1.length
    const len2 = str2.length

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        )
      }
    }

    const maxLen = Math.max(len1, len2)
    return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen
  }

  /**
   * Check if text matches any keywords
   */
  private keywordMatch(text: string, keywords: string[]): boolean {
    const normalizedText = text.toLowerCase()
    return keywords.some(keyword => 
      normalizedText.includes(keyword.toLowerCase())
    )
  }

  /**
   * Split text into chunks for analysis
   */
  private splitIntoChunks(text: string, chunkSize: number): Array<{
    content: string
    startIndex: number
    endIndex: number
  }> {
    const chunks: Array<{ content: string; startIndex: number; endIndex: number }> = []
    const lines = text.split('\n')
    
    let currentChunk = ''
    let startIndex = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (currentChunk.length + line.length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk,
          startIndex,
          endIndex: i
        })
        currentChunk = line
        startIndex = i
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push({
        content: currentChunk,
        startIndex,
        endIndex: lines.length
      })
    }

    return chunks
  }

  /**
   * Merge adjacent modules that are the same
   */
  private mergeAdjacentModules(modules: ModuleInfo[]): ModuleInfo[] {
    if (modules.length === 0) return modules

    const merged: ModuleInfo[] = []
    let current = modules[0]

    for (let i = 1; i < modules.length; i++) {
      const next = modules[i]
      
      if (current.moduleId === next.moduleId && 
          current.endIndex === next.startIndex) {
        // Merge with current
        current.endIndex = next.endIndex
        current.confidence = Math.max(current.confidence, next.confidence)
      } else {
        merged.push(current)
        current = next
      }
    }

    merged.push(current)
    return merged
  }

  /**
   * Assign a chunk to the most appropriate module
   */
  assignChunkToModule(
    chunkContent: string, 
    course: 'fitter' | 'electrician',
    detectedModules?: ModuleInfo[]
  ): { moduleId: string; confidence: number } | null {
    const modules = this.moduleMap.get(course) || []
    
    // If we have detected modules, prefer those
    if (detectedModules && detectedModules.length > 0) {
      for (const detected of detectedModules) {
        if (this.chunkBelongsToModule(chunkContent, detected)) {
          return {
            moduleId: detected.moduleId,
            confidence: detected.confidence
          }
        }
      }
    }

    // Fall back to content-based matching
    const scores = modules.map(module => ({
      moduleId: module.module_id,
      score: this.calculateContentScore(chunkContent, module)
    }))

    const bestMatch = scores.reduce((best, current) => 
      current.score > best.score ? current : best
    )

    if (bestMatch.score > 0.2) { // Lower threshold for chunk assignment
      return {
        moduleId: bestMatch.moduleId,
        confidence: bestMatch.score
      }
    }

    return null
  }

  /**
   * Check if a chunk belongs to a detected module
   */
  private chunkBelongsToModule(chunkContent: string, module: ModuleInfo): boolean {
    const moduleMapping = this.moduleMap.get('fitter')?.find(m => m.module_id === module.moduleId) ||
                         this.moduleMap.get('electrician')?.find(m => m.module_id === module.moduleId)
    
    if (!moduleMapping) return false

    return this.calculateContentScore(chunkContent, moduleMapping) > 0.1
  }

  /**
   * Get all modules for a course
   */
  getModulesForCourse(course: 'fitter' | 'electrician'): ModuleMapping[] {
    return this.moduleMap.get(course) || []
  }
}

// Export default instance
export const moduleDetector = new ModuleDetector()