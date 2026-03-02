import { Pool } from 'pg';
import { ModuleStructure } from './index-extractor';

export class SyllabusStructureStorage {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
      password: 'admin',
    });
  }

  /**
   * Store extracted syllabus structure
   */
  async storeSyllabusStructure(
    course: string,
    tradeType: string,
    modules: ModuleStructure[]
  ): Promise<void> {
    for (const module of modules) {
      // Generate module ID
      const moduleId = this.generateModuleId(course, tradeType, module.moduleName);

      try {
        await this.pool.query(
          `INSERT INTO module_syllabus 
           (course, trade_type, module_id, module_name, module_number, topics, extracted_from)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (course, trade_type, module_id) 
           DO UPDATE SET 
             module_name = EXCLUDED.module_name,
             module_number = EXCLUDED.module_number,
             topics = EXCLUDED.topics,
             updated_at = NOW()`,
          [
            course,
            tradeType,
            moduleId,
            module.moduleName,
            module.moduleNumber,
            JSON.stringify(module.topics),
            'index'
          ]
        );
      } catch (error) {
        console.error(`Error storing module ${module.moduleName}:`, error);
        throw error;
      }
    }
  }

  /**
   * Generate a consistent module ID
   */
  private generateModuleId(course: string, tradeType: string, moduleName: string): string {
    const normalized = moduleName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const tradeAbbrev = tradeType === 'trade_theory' ? 'tt' : 'tp';
    return `${course}-${tradeAbbrev}-${normalized}`;
  }

  /**
   * Retrieve syllabus structure for a course
   */
  async getSyllabusStructure(
    course: string,
    tradeType: string
  ): Promise<ModuleStructure[]> {
    const result = await this.pool.query(
      `SELECT module_name, module_number, topics
       FROM module_syllabus
       WHERE course = $1 AND trade_type = $2
       ORDER BY module_number NULLS LAST, module_name`,
      [course, tradeType]
    );

    return result.rows.map((row: any) => ({
      moduleName: row.module_name,
      moduleNumber: row.module_number,
      topics: row.topics
    }));
  }

  /**
   * Get specific module details
   */
  async getModuleStructure(
    course: string,
    tradeType: string,
    moduleId: string
  ): Promise<ModuleStructure | null> {
    const result = await this.pool.query(
      `SELECT module_name, module_number, topics
       FROM module_syllabus
       WHERE course = $1 AND trade_type = $2 AND module_id = $3`,
      [course, tradeType, moduleId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      moduleName: row.module_name,
      moduleNumber: row.module_number,
      topics: row.topics
    };
  }

  /**
   * Check if syllabus exists for a course
   */
  async syllabusExists(course: string, tradeType: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count
       FROM module_syllabus
       WHERE course = $1 AND trade_type = $2`,
      [course, tradeType]
    );

    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Get extraction statistics
   */
  async getStatistics(): Promise<any> {
    const result = await this.pool.query(`
      SELECT 
        course,
        trade_type,
        COUNT(*) as module_count,
        SUM(jsonb_array_length(topics)) as total_topics
      FROM module_syllabus
      GROUP BY course, trade_type
      ORDER BY course, trade_type
    `);

    return result.rows;
  }

  /**
   * Clear syllabus data
   */
  async clearSyllabusData(course?: string): Promise<void> {
    if (course) {
      await this.pool.query(
        'DELETE FROM module_syllabus WHERE course = $1',
        [course]
      );
    } else {
      await this.pool.query('DELETE FROM module_syllabus');
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
