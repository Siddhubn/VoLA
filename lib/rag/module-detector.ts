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
// Fitter Trade Practical (TP) Modules
export const FITTER_TP_MODULES: ModuleMapping[] = [
  {
    course: 'fitter',
    module_id: 'fitter-tp-safety-practices',
    module_name: 'Safety Practices (TP)',
    keywords: ['safety', 'hazard', 'ppe', 'personal protective equipment', 'accident', 'first aid', 'emergency', 'workshop safety', 'practical safety'],
    description: 'Practical workplace safety, hazard identification, and emergency procedures',
    display_order: 1
  },
  {
    course: 'fitter',
    module_id: 'fitter-tp-hand-tools',
    module_name: 'Hand Tools and Measuring Instruments (TP)',
    keywords: ['hand tools', 'measuring', 'caliper', 'micrometer', 'gauge', 'ruler', 'hammer', 'chisel', 'practical use', 'tool handling'],
    description: 'Practical use of hand tools and precision measuring instruments',
    display_order: 2
  },
  {
    course: 'fitter',
    module_id: 'fitter-tp-marking-cutting',
    module_name: 'Marking and Cutting (TP)',
    keywords: ['marking', 'cutting', 'scriber', 'punch', 'hacksaw', 'file', 'drilling', 'reaming', 'practical marking', 'cutting practice'],
    description: 'Practical marking out and cutting operations on metal',
    display_order: 3
  },
  {
    course: 'fitter',
    module_id: 'fitter-tp-fitting-assembly',
    module_name: 'Fitting and Assembly (TP)',
    keywords: ['fitting', 'assembly', 'joint', 'rivet', 'bolt', 'nut', 'thread', 'tap', 'die', 'practical assembly', 'workshop practice'],
    description: 'Practical fitting operations and mechanical assembly techniques',
    display_order: 4
  },
  {
    course: 'fitter',
    module_id: 'fitter-tp-machine-tools',
    module_name: 'Machine Tools Operation (TP)',
    keywords: ['lathe', 'milling', 'drilling machine', 'grinder', 'shaper', 'planer', 'machining', 'machine operation', 'practical machining'],
    description: 'Practical operation of various machine tools',
    display_order: 5
  },
  {
    course: 'fitter',
    module_id: 'fitter-tp-maintenance',
    module_name: 'Maintenance and Repair (TP)',
    keywords: ['maintenance', 'repair', 'troubleshooting', 'preventive', 'breakdown', 'lubrication', 'practical maintenance', 'hands-on repair'],
    description: 'Practical equipment maintenance and repair procedures',
    display_order: 6
  }
]

// Fitter Trade Theory (TT) Modules
export const FITTER_TT_MODULES: ModuleMapping[] = [
  {
    course: 'fitter',
    module_id: 'fitter-tt-engineering-drawing',
    module_name: 'Engineering Drawing (TT)',
    keywords: ['engineering drawing', 'technical drawing', 'blueprint', 'orthographic', 'isometric', 'dimensioning', 'tolerances', 'symbols'],
    description: 'Engineering drawing principles, symbols, and interpretation',
    display_order: 1
  },
  {
    course: 'fitter',
    module_id: 'fitter-tt-materials-science',
    module_name: 'Materials Science (TT)',
    keywords: ['materials', 'metals', 'alloys', 'properties', 'heat treatment', 'metallurgy', 'steel', 'iron', 'material properties'],
    description: 'Properties and characteristics of engineering materials',
    display_order: 2
  },
  {
    course: 'fitter',
    module_id: 'fitter-tt-manufacturing-processes',
    module_name: 'Manufacturing Processes (TT)',
    keywords: ['manufacturing', 'processes', 'casting', 'forging', 'welding', 'machining theory', 'production methods'],
    description: 'Theory of manufacturing and production processes',
    display_order: 3
  },
  {
    course: 'fitter',
    module_id: 'fitter-tt-metrology',
    module_name: 'Metrology and Quality Control (TT)',
    keywords: ['metrology', 'measurement', 'precision', 'accuracy', 'quality control', 'inspection', 'standards', 'calibration'],
    description: 'Measurement science and quality control principles',
    display_order: 4
  },
  {
    course: 'fitter',
    module_id: 'fitter-tt-mechanical-principles',
    module_name: 'Mechanical Principles (TT)',
    keywords: ['mechanics', 'forces', 'moments', 'stress', 'strain', 'mechanical advantage', 'simple machines', 'kinematics'],
    description: 'Fundamental mechanical engineering principles',
    display_order: 5
  },
  {
    course: 'fitter',
    module_id: 'fitter-tt-workshop-technology',
    module_name: 'Workshop Technology (TT)',
    keywords: ['workshop technology', 'machine tools theory', 'cutting tools', 'tool geometry', 'speeds and feeds', 'workshop calculations'],
    description: 'Theoretical aspects of workshop technology and machine tools',
    display_order: 6
  }
]

// Electrician Trade Practical (TP) Modules
export const ELECTRICIAN_TP_MODULES: ModuleMapping[] = [
  {
    course: 'electrician',
    module_id: 'electrician-tp-electrical-safety',
    module_name: 'Electrical Safety (TP)',
    keywords: ['electrical safety', 'shock', 'electrocution', 'earthing', 'grounding', 'isolation', 'lockout', 'practical safety', 'safety procedures'],
    description: 'Practical electrical safety procedures and practices',
    display_order: 1
  },
  {
    course: 'electrician',
    module_id: 'electrician-tp-basic-wiring',
    module_name: 'Basic Wiring (TP)',
    keywords: ['wiring', 'installation', 'conduit', 'cable', 'switch', 'socket', 'practical wiring', 'house wiring', 'electrical connections'],
    description: 'Practical electrical wiring and installation techniques',
    display_order: 2
  },
  {
    course: 'electrician',
    module_id: 'electrician-tp-instruments',
    module_name: 'Electrical Instruments (TP)',
    keywords: ['multimeter', 'ammeter', 'voltmeter', 'wattmeter', 'oscilloscope', 'clamp meter', 'megger', 'practical measurement', 'instrument use'],
    description: 'Practical use of electrical measuring instruments',
    display_order: 3
  },
  {
    course: 'electrician',
    module_id: 'electrician-tp-motor-control',
    module_name: 'Motor Control (TP)',
    keywords: ['motor', 'starter', 'control circuit', 'contactor', 'relay', 'practical motor control', 'motor installation'],
    description: 'Practical motor control and installation procedures',
    display_order: 4
  },
  {
    course: 'electrician',
    module_id: 'electrician-tp-power-distribution',
    module_name: 'Power Distribution (TP)',
    keywords: ['distribution board', 'panel', 'mcb', 'fuse', 'practical distribution', 'power installation', 'electrical panels'],
    description: 'Practical power distribution and panel work',
    display_order: 5
  },
  {
    course: 'electrician',
    module_id: 'electrician-tp-maintenance',
    module_name: 'Electrical Maintenance (TP)',
    keywords: ['maintenance', 'troubleshooting', 'repair', 'testing', 'practical maintenance', 'electrical repair', 'fault finding'],
    description: 'Practical electrical maintenance and troubleshooting',
    display_order: 6
  }
]

// Electrician Trade Theory (TT) Modules
export const ELECTRICIAN_TT_MODULES: ModuleMapping[] = [
  {
    course: 'electrician',
    module_id: 'electrician-tt-basic-electricity',
    module_name: 'Basic Electricity (TT)',
    keywords: ['voltage', 'current', 'resistance', 'ohm', 'circuit', 'conductor', 'insulator', 'semiconductor', 'electrical theory'],
    description: 'Fundamental electrical theory and principles',
    display_order: 1
  },
  {
    course: 'electrician',
    module_id: 'electrician-tt-ac-dc-theory',
    module_name: 'AC/DC Theory (TT)',
    keywords: ['alternating current', 'direct current', 'ac theory', 'dc theory', 'frequency', 'phase', 'power factor', 'impedance'],
    description: 'Theory of alternating and direct current systems',
    display_order: 2
  },
  {
    course: 'electrician',
    module_id: 'electrician-tt-electrical-machines',
    module_name: 'Electrical Machines (TT)',
    keywords: ['motor theory', 'generator theory', 'transformer theory', 'induction', 'synchronous', 'machine principles'],
    description: 'Theory of electrical machines and their operation',
    display_order: 3
  },
  {
    course: 'electrician',
    module_id: 'electrician-tt-power-systems',
    module_name: 'Power Systems (TT)',
    keywords: ['power generation', 'transmission', 'distribution', 'substation', 'protection', 'relay', 'power system theory'],
    description: 'Theory of power generation, transmission and distribution',
    display_order: 4
  },
  {
    course: 'electrician',
    module_id: 'electrician-tt-electronics',
    module_name: 'Electronics (TT)',
    keywords: ['electronics', 'semiconductor', 'diode', 'transistor', 'amplifier', 'digital electronics', 'electronic theory'],
    description: 'Basic electronics theory and semiconductor devices',
    display_order: 5
  },
  {
    course: 'electrician',
    module_id: 'electrician-tt-electrical-codes',
    module_name: 'Electrical Codes and Standards (TT)',
    keywords: ['electrical codes', 'standards', 'regulations', 'iec', 'bis', 'safety standards', 'wiring rules'],
    description: 'Electrical codes, standards and safety regulations',
    display_order: 6
  }
]

// Combined module arrays for convenience
export const FITTER_MODULES: ModuleMapping[] = [...FITTER_TP_MODULES, ...FITTER_TT_MODULES]
export const ELECTRICIAN_MODULES: ModuleMapping[] = [...ELECTRICIAN_TP_MODULES, ...ELECTRICIAN_TT_MODULES]

export interface SyllabusInfo {
  course: 'fitter' | 'electrician'
  syllabusType: 'TP' | 'TT' | 'unknown'
  confidence: number
}

export class ModuleDetector {
  private moduleMap: Map<string, ModuleMapping[]>

  constructor() {
    this.moduleMap = new Map()
    this.moduleMap.set('fitter-tp', FITTER_TP_MODULES)
    this.moduleMap.set('fitter-tt', FITTER_TT_MODULES)
    this.moduleMap.set('electrician-tp', ELECTRICIAN_TP_MODULES)
    this.moduleMap.set('electrician-tt', ELECTRICIAN_TT_MODULES)
  }

  /**
   * Detect syllabus type from filename and content
   */
  detectSyllabusType(filename: string, content?: string): SyllabusInfo {
    const normalizedFilename = filename.toLowerCase()
    
    // Extract course from filename
    let course: 'fitter' | 'electrician' = 'fitter'
    if (normalizedFilename.includes('electrician')) {
      course = 'electrician'
    } else if (normalizedFilename.includes('fitter')) {
      course = 'fitter'
    }

    // Extract syllabus type from filename
    let syllabusType: 'TP' | 'TT' | 'unknown' = 'unknown'
    let confidence = 0.5

    if (normalizedFilename.includes('tp') || normalizedFilename.includes('trade practical')) {
      syllabusType = 'TP'
      confidence = 0.9
    } else if (normalizedFilename.includes('tt') || normalizedFilename.includes('trade theory')) {
      syllabusType = 'TT'
      confidence = 0.9
    }

    // If filename doesn't clearly indicate type, analyze content
    if (syllabusType === 'unknown' && content) {
      const contentAnalysis = this.analyzeSyllabusTypeFromContent(content)
      syllabusType = contentAnalysis.type
      confidence = contentAnalysis.confidence
    }

    return {
      course,
      syllabusType,
      confidence
    }
  }

  /**
   * Analyze content to determine syllabus type
   */
  private analyzeSyllabusTypeFromContent(content: string): { type: 'TP' | 'TT'; confidence: number } {
    const normalizedContent = content.toLowerCase()
    
    // Keywords that indicate Trade Practical (TP)
    const tpKeywords = [
      'practical', 'workshop', 'hands-on', 'demonstration', 'exercise', 'lab work',
      'tool handling', 'machine operation', 'assembly practice', 'wiring practice',
      'safety procedures', 'practical application', 'workshop practice', 'skill development'
    ]

    // Keywords that indicate Trade Theory (TT)
    const ttKeywords = [
      'theory', 'principles', 'concepts', 'fundamentals', 'definition', 'explanation',
      'formula', 'calculation', 'analysis', 'design', 'theoretical', 'academic',
      'engineering drawing', 'material science', 'electrical theory', 'mechanical principles'
    ]

    let tpScore = 0
    let ttScore = 0

    // Count keyword matches
    for (const keyword of tpKeywords) {
      if (normalizedContent.includes(keyword)) {
        tpScore += keyword.length > 8 ? 2 : 1 // Longer keywords get more weight
      }
    }

    for (const keyword of ttKeywords) {
      if (normalizedContent.includes(keyword)) {
        ttScore += keyword.length > 8 ? 2 : 1
      }
    }

    // Determine type based on scores
    if (tpScore > ttScore) {
      return {
        type: 'TP',
        confidence: Math.min(0.8, tpScore / (tpScore + ttScore))
      }
    } else if (ttScore > tpScore) {
      return {
        type: 'TT',
        confidence: Math.min(0.8, ttScore / (tpScore + ttScore))
      }
    } else {
      // Default to TP if unclear
      return {
        type: 'TP',
        confidence: 0.3
      }
    }
  }

  /**
   * Detect module boundaries in text content
   */
  detectModules(text: string, course: 'fitter' | 'electrician', syllabusType: 'TP' | 'TT' = 'TP'): ModuleDetectionResult {
    const moduleKey = `${course}-${syllabusType.toLowerCase()}`
    const modules = this.moduleMap.get(moduleKey) || []
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
    syllabusType: 'TP' | 'TT' = 'TP',
    detectedModules?: ModuleInfo[]
  ): { moduleId: string; confidence: number } | null {
    const moduleKey = `${course}-${syllabusType.toLowerCase()}`
    const modules = this.moduleMap.get(moduleKey) || []
    
    // If we have detected modules, prefer those
    if (detectedModules && detectedModules.length > 0) {
      for (const detected of detectedModules) {
        if (this.chunkBelongsToModule(chunkContent, detected, course, syllabusType)) {
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
  private chunkBelongsToModule(
    chunkContent: string, 
    module: ModuleInfo, 
    course: 'fitter' | 'electrician',
    syllabusType: 'TP' | 'TT'
  ): boolean {
    const moduleKey = `${course}-${syllabusType.toLowerCase()}`
    const moduleMapping = this.moduleMap.get(moduleKey)?.find(m => m.module_id === module.moduleId)
    
    if (!moduleMapping) return false

    return this.calculateContentScore(chunkContent, moduleMapping) > 0.1
  }

  /**
   * Get all modules for a course and syllabus type
   */
  getModulesForCourse(course: 'fitter' | 'electrician', syllabusType: 'TP' | 'TT' = 'TP'): ModuleMapping[] {
    const moduleKey = `${course}-${syllabusType.toLowerCase()}`
    return this.moduleMap.get(moduleKey) || []
  }

  /**
   * Get all available syllabus types for a course
   */
  getSyllabusTypes(course: 'fitter' | 'electrician'): Array<{ type: 'TP' | 'TT'; name: string }> {
    return [
      { type: 'TP', name: 'Trade Practical' },
      { type: 'TT', name: 'Trade Theory' }
    ]
  }

  /**
   * Get comprehensive course information
   */
  getCourseInfo(course: 'fitter' | 'electrician') {
    return {
      course,
      syllabusTypes: this.getSyllabusTypes(course),
      tpModules: this.getModulesForCourse(course, 'TP'),
      ttModules: this.getModulesForCourse(course, 'TT')
    }
  }
}

// Export default instance
export const moduleDetector = new ModuleDetector()