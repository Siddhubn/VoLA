import { query } from '../postgresql'
import { ModuleMappingCache } from './cache-service'

export interface ModuleMapping {
  id: number
  course: string
  moduleId: string
  moduleName: string
  keywords: string[]
  description: string | null
  displayOrder: number
}

export class ModuleMappingService {
  private cache: ModuleMappingCache

  constructor(cache?: ModuleMappingCache) {
    this.cache = cache || new ModuleMappingCache()
  }

  /**
   * Get all module mappings for a course
   */
  async getModuleMappings(course: 'fitter' | 'electrician'): Promise<ModuleMapping[]> {
    // Check cache first
    const cached = this.cache.getModuleMapping(course)
    if (cached) {
      return cached
    }

    // Query database
    const result = await query(
      'SELECT * FROM module_mapping WHERE course = $1 ORDER BY display_order',
      [course]
    )

    const mappings: ModuleMapping[] = result.rows.map((row: any) => ({
      id: row.id,
      course: row.course,
      moduleId: row.module_id,
      moduleName: row.module_name,
      keywords: row.keywords || [],
      description: row.description,
      displayOrder: row.display_order
    }))

    // Cache the result
    this.cache.setModuleMapping(course, mappings)

    return mappings
  }

  /**
   * Get a specific module mapping
   */
  async getModuleMapping(course: 'fitter' | 'electrician', moduleId: string): Promise<ModuleMapping | null> {
    const mappings = await this.getModuleMappings(course)
    return mappings.find(m => m.moduleId === moduleId) || null
  }

  /**
   * Invalidate cache for a course
   */
  invalidateCache(course: 'fitter' | 'electrician'): void {
    this.cache.invalidateModuleMapping(course)
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats()
  }
}

// Export singleton instance
export const moduleMappingService = new ModuleMappingService()
