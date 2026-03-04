/**
 * Quiz Helper - Content selection for quiz generation
 * Uses content classification for balanced, high-quality questions
 */

import { query } from './postgresql';

export interface QuizContent {
  id: number;
  content: string;
  module_name: string;
  module_number: number;
  section_title: string | null;
  content_type: string;
  priority: number;
  word_count: number;
  trade_type: string;
  topic_keywords: string[];
}

export interface QuizMetadata {
  moduleId: string;
  tradeType: 'TT' | 'TP';
  totalQuestions: number;
  contentTypes: Record<string, number>;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
}

/**
 * Get diverse content for quiz generation
 * Prioritizes theory and definitions, includes practical content
 */
export async function getQuizContent(
  moduleId: string,
  tradeType: 'TT' | 'TP',
  questionCount: number = 10
): Promise<QuizContent[]> {
  const result = await query(`
    SELECT 
      id,
      content,
      module_name,
      module_number,
      section_title,
      content_type,
      priority,
      word_count,
      trade_type,
      topic_keywords
    FROM knowledge_chunks
    WHERE trade = 'electrician'
      AND trade_type = $1
      AND module_id = $2
      AND content_type IN ('theory', 'definition', 'practical')
      AND word_count > 100
      AND word_count < 800
    ORDER BY 
      CASE content_type
        WHEN 'definition' THEN 1
        WHEN 'theory' THEN 2
        WHEN 'practical' THEN 3
        ELSE 4
      END,
      priority DESC,
      RANDOM()
    LIMIT $3
  `, [tradeType, moduleId, questionCount * 2]); // Get 2x for variety

  return result.rows;
}

/**
 * Get safety-focused questions
 * High priority safety content for important quiz questions
 */
export async function getSafetyQuestions(
  tradeType: 'TT' | 'TP',
  moduleId?: string,
  count: number = 5
): Promise<QuizContent[]> {
  const conditions = [
    'trade = $1',
    'trade_type = $2',
    'content_type = $3',
    'priority >= 8'
  ];
  const params: any[] = ['electrician', tradeType, 'safety'];

  if (moduleId) {
    conditions.push('module_id = $4');
    params.push(moduleId);
    params.push(count);
  } else {
    params.push(count);
  }

  const limitIndex = params.length;

  const result = await query(`
    SELECT 
      id,
      content,
      module_name,
      module_number,
      section_title,
      content_type,
      priority,
      word_count,
      trade_type,
      topic_keywords
    FROM knowledge_chunks
    WHERE ${conditions.join(' AND ')}
    ORDER BY priority DESC, RANDOM()
    LIMIT $${limitIndex}
  `, params);

  return result.rows;
}

/**
 * Get tools and equipment questions
 */
export async function getToolsQuestions(
  moduleId: string,
  tradeType: 'TT' | 'TP',
  count: number = 5
): Promise<QuizContent[]> {
  const result = await query(`
    SELECT 
      id,
      content,
      module_name,
      module_number,
      section_title,
      content_type,
      priority,
      word_count,
      trade_type,
      topic_keywords
    FROM knowledge_chunks
    WHERE trade = 'electrician'
      AND trade_type = $1
      AND module_id = $2
      AND content_type = 'tools'
      AND word_count > 100
    ORDER BY priority DESC, RANDOM()
    LIMIT $3
  `, [tradeType, moduleId, count]);

  return result.rows;
}

/**
 * Get mixed quiz content with balanced distribution
 * Distribution: 40% theory, 30% safety, 20% practical, 10% tools
 * Implements Requirements 15.1, 6.2
 */
export async function getMixedQuizContent(
  moduleId: string,
  tradeType: 'TT' | 'TP',
  total: number = 10
): Promise<{
  content: QuizContent[];
  distribution: Record<string, number>;
}> {
  // Calculate distribution: 40% theory, 30% safety, 20% practical, 10% tools
  const theoryCount = Math.round(total * 0.4);    // 40% theory
  const safetyCount = Math.round(total * 0.3);    // 30% safety
  const practicalCount = Math.round(total * 0.2); // 20% practical
  const toolsCount = total - theoryCount - safetyCount - practicalCount; // 10% tools (remaining)

  console.log(`📊 Quiz distribution: Theory=${theoryCount}, Safety=${safetyCount}, Practical=${practicalCount}, Tools=${toolsCount}`);

  // Fetch content for each type
  const [theoryContent, safetyContent, practicalContent, toolsContent] = await Promise.all([
    getContentByType('theory', tradeType, moduleId, theoryCount * 2),
    getSafetyQuestions(tradeType, moduleId, safetyCount * 2),
    getContentByType('practical', tradeType, moduleId, practicalCount * 2),
    getToolsQuestions(moduleId, tradeType, toolsCount * 2)
  ]);

  // Select exact counts needed
  const selectedContent = [
    ...theoryContent.slice(0, theoryCount),
    ...safetyContent.slice(0, safetyCount),
    ...practicalContent.slice(0, practicalCount),
    ...toolsContent.slice(0, toolsCount)
  ];

  // Shuffle array for random question order
  for (let i = selectedContent.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selectedContent[i], selectedContent[j]] = [selectedContent[j], selectedContent[i]];
  }

  const actualDistribution = {
    theory: selectedContent.filter(c => c.content_type === 'theory').length,
    safety: selectedContent.filter(c => c.content_type === 'safety').length,
    practical: selectedContent.filter(c => c.content_type === 'practical').length,
    tools: selectedContent.filter(c => c.content_type === 'tools').length
  };

  console.log(`✅ Actual distribution:`, actualDistribution);

  return {
    content: selectedContent,
    distribution: actualDistribution
  };
}

/**
 * Get balanced quiz content mix (legacy function)
 * @deprecated Use getMixedQuizContent instead for proper 40/30/20/10 distribution
 */
export async function getBalancedQuizContent(
  moduleId: string,
  tradeType: 'TT' | 'TP',
  totalQuestions: number = 10
): Promise<{
  content: QuizContent[];
  distribution: Record<string, number>;
}> {
  // Delegate to getMixedQuizContent for consistent behavior
  return getMixedQuizContent(moduleId, tradeType, totalQuestions);
}

/**
 * Get content by specific content type
 */
export async function getContentByType(
  contentType: string,
  tradeType: 'TT' | 'TP',
  moduleId?: string,
  limit: number = 10
): Promise<QuizContent[]> {
  const conditions = [
    'trade = $1',
    'trade_type = $2',
    'content_type = $3'
  ];
  const params: any[] = ['electrician', tradeType, contentType];

  if (moduleId) {
    conditions.push('module_id = $4');
    params.push(moduleId);
    params.push(limit);
  } else {
    params.push(limit);
  }

  const limitIndex = params.length;

  const result = await query(`
    SELECT 
      id,
      content,
      module_name,
      module_number,
      section_title,
      content_type,
      priority,
      word_count,
      trade_type,
      topic_keywords
    FROM knowledge_chunks
    WHERE ${conditions.join(' AND ')}
      AND word_count > 100
    ORDER BY priority DESC, RANDOM()
    LIMIT $${limitIndex}
  `, params);

  return result.rows;
}

/**
 * Get comprehensive module quiz
 * Covers all modules with balanced content
 */
export async function getComprehensiveQuizContent(
  tradeType: 'TT' | 'TP',
  totalQuestions: number = 20
): Promise<QuizContent[]> {
  const questionsPerModule = Math.ceil(totalQuestions / 12); // 12 modules

  const result = await query(`
    WITH ranked_content AS (
      SELECT 
        id,
        content,
        module_name,
        module_number,
        section_title,
        content_type,
        priority,
        word_count,
        trade_type,
        topic_keywords,
        ROW_NUMBER() OVER (
          PARTITION BY module_id 
          ORDER BY 
            CASE content_type
              WHEN 'safety' THEN 1
              WHEN 'definition' THEN 2
              WHEN 'theory' THEN 3
              WHEN 'practical' THEN 4
              WHEN 'tools' THEN 5
              ELSE 6
            END,
            priority DESC,
            RANDOM()
        ) as rn
      FROM knowledge_chunks
      WHERE trade = 'electrician'
        AND trade_type = $1
        AND content_type IN ('theory', 'definition', 'practical', 'safety', 'tools')
        AND word_count > 100
        AND word_count < 800
    )
    SELECT 
      id,
      content,
      module_name,
      module_number,
      section_title,
      content_type,
      priority,
      word_count,
      trade_type,
      topic_keywords
    FROM ranked_content
    WHERE rn <= $2
    ORDER BY RANDOM()
    LIMIT $3
  `, [tradeType, questionsPerModule, totalQuestions]);

  return result.rows;
}

/**
 * Get quiz statistics for a module
 */
export async function getModuleQuizStats(
  moduleId: string,
  tradeType: 'TT' | 'TP'
): Promise<{
  totalChunks: number;
  contentTypes: Record<string, number>;
  avgPriority: number;
}> {
  const result = await query(`
    SELECT 
      COUNT(*) as total_chunks,
      AVG(priority) as avg_priority,
      json_object_agg(content_type, type_count) as content_types
    FROM (
      SELECT 
        content_type,
        COUNT(*) as type_count,
        AVG(priority) as priority
      FROM knowledge_chunks
      WHERE trade = 'electrician'
        AND trade_type = $1
        AND module_id = $2
      GROUP BY content_type
    ) subquery
  `, [tradeType, moduleId]);

  const row = result.rows[0];
  
  return {
    totalChunks: parseInt(row.total_chunks) || 0,
    contentTypes: row.content_types || {},
    avgPriority: parseFloat(row.avg_priority) || 0
  };
}

/**
 * Calculate quiz difficulty based on content
 */
export function calculateQuizDifficulty(
  content: QuizContent[]
): 'easy' | 'medium' | 'hard' {
  if (content.length === 0) return 'medium';

  const avgPriority = content.reduce((sum, c) => sum + c.priority, 0) / content.length;
  const safetyCount = content.filter(c => c.content_type === 'safety').length;
  const theoryCount = content.filter(c => c.content_type === 'theory').length;
  
  // High safety content or high priority = easier
  if (safetyCount > content.length * 0.4 || avgPriority >= 8) {
    return 'easy';
  } 
  // High theory content or medium priority = medium
  else if (theoryCount > content.length * 0.5 || avgPriority >= 6) {
    return 'medium';
  } 
  // Complex practical content = hard
  else {
    return 'hard';
  }
}

/**
 * Estimate quiz completion time
 */
export function estimateQuizTime(
  questionCount: number, 
  difficulty: 'easy' | 'medium' | 'hard'
): number {
  const baseTimePerQuestion = {
    easy: 30,    // 30 seconds
    medium: 45,  // 45 seconds
    hard: 60     // 60 seconds
  };
  
  const timePerQuestion = baseTimePerQuestion[difficulty];
  return questionCount * timePerQuestion; // in seconds
}

/**
 * Format quiz time for display
 */
export function formatQuizTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds} seconds`;
  } else if (remainingSeconds === 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds} seconds`;
  }
}
