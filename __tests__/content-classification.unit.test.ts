/**
 * Unit Tests for Content Classification System
 * Validates: Requirements 13.1, 13.2
 * 
 * Tests content type detection, priority scoring, and keyword extraction
 */

import { describe, it, expect } from 'vitest';

// Content type classification patterns (from process-module-pdfs-intelligent.ts)
const CONTENT_TYPE_PATTERNS = {
  safety: /safety|hazard|precaution|protective|PPE|danger|warning|first aid/i,
  tools: /tool|equipment|instrument|device|apparatus|machine/i,
  theory: /principle|theory|concept|definition|formula|law|equation/i,
  practical: /procedure|step|method|process|operation|practice|exercise/i,
  example: /example|illustration|case study|application/i,
  definition: /define|definition|meaning|refers to|is called|known as/i,
};

/**
 * Classify content type based on text
 */
function classifyContentType(text: string): string {
  const lowerText = text.toLowerCase();
  
  for (const [type, pattern] of Object.entries(CONTENT_TYPE_PATTERNS)) {
    if (pattern.test(lowerText)) {
      return type;
    }
  }
  
  return 'theory'; // Default
}

/**
 * Calculate priority based on content type and characteristics
 */
function calculatePriority(content: string, contentType: string, isSynthetic: boolean): number {
  if (isSynthetic) return 10;
  
  const basePriority: Record<string, number> = {
    'module_overview': 9,
    'safety': 8,
    'definition': 7,
    'theory': 6,
    'practical': 6,
    'tools': 5,
    'example': 4,
    'procedure': 6
  };
  
  let priority = basePriority[contentType] || 5;
  
  // Boost if content is substantial
  if (content.length > 2000) priority += 1;
  
  // Cap at 10
  return Math.min(priority, 10);
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4);
  
  const freq: Record<string, number> = {};
  words.forEach(w => {
    freq[w] = (freq[w] || 0) + 1;
  });
  
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

describe('Content Classification - Type Detection', () => {
  it('should classify safety content', () => {
    const safetyTexts = [
      'Always wear PPE when working with electricity',
      'Safety precautions must be followed',
      'Warning: High voltage hazard',
      'First aid procedures for electrical shock',
      'Protective equipment is required'
    ];
    
    safetyTexts.forEach(text => {
      const type = classifyContentType(text);
      expect(type).toBe('safety');
    });
  });
  
  it('should classify tools content', () => {
    const toolTexts = [
      'Use a multimeter to measure voltage',
      'The equipment required includes wire strippers',
      'This instrument measures current',
      'The device is used for testing circuits',
      'Electrical apparatus must be calibrated'
    ];
    
    toolTexts.forEach(text => {
      const type = classifyContentType(text);
      expect(type).toBe('tools');
    });
  });
  
  it('should classify theory content', () => {
    const theoryTexts = [
      'Ohms law is a fundamental principle',
      'The theory of electromagnetic induction',
      'This concept explains voltage drop',
      'The definition of resistance',
      'The formula for power calculation',
      'Kirchhoffs law states that'
    ];
    
    theoryTexts.forEach(text => {
      const type = classifyContentType(text);
      expect(['theory', 'definition']).toContain(type);
    });
  });
  
  it('should classify practical content', () => {
    const practicalTexts = [
      'Follow this procedure to install a switch',
      'The step-by-step method for wiring',
      'This process involves connecting wires',
      'The operation requires careful practice',
      'Exercise: Install a circuit breaker'
    ];
    
    practicalTexts.forEach(text => {
      const type = classifyContentType(text);
      expect(type).toBe('practical');
    });
  });
  
  it('should classify example content', () => {
    const exampleTexts = [
      'For example, a simple circuit consists of',
      'This illustration shows the wiring diagram',
      'Case study: Industrial electrical installation',
      'Application of Ohms law in real circuits'
    ];
    
    exampleTexts.forEach(text => {
      const type = classifyContentType(text);
      expect(type).toBe('example');
    });
  });
  
  it('should classify definition content', () => {
    const definitionTexts = [
      'Voltage is defined as electrical potential difference',
      'The definition of current is charge flow',
      'Resistance means opposition to current flow',
      'This refers to the electrical property',
      'It is called electromagnetic induction',
      'Known as the power factor'
    ];
    
    definitionTexts.forEach(text => {
      const type = classifyContentType(text);
      expect(type).toBe('definition');
    });
  });
  
  it('should default to theory for ambiguous content', () => {
    const ambiguousTexts = [
      'Electrical circuits are important',
      'Understanding electricity is essential',
      'This chapter covers basic concepts'
    ];
    
    ambiguousTexts.forEach(text => {
      const type = classifyContentType(text);
      expect(type).toBe('theory');
    });
  });
  
  it('should be case-insensitive', () => {
    const text1 = 'SAFETY PRECAUTIONS ARE REQUIRED';
    const text2 = 'safety precautions are required';
    const text3 = 'Safety Precautions Are Required';
    
    expect(classifyContentType(text1)).toBe('safety');
    expect(classifyContentType(text2)).toBe('safety');
    expect(classifyContentType(text3)).toBe('safety');
  });
});

describe('Content Classification - Priority Scoring', () => {
  it('should assign priority 10 to synthetic content', () => {
    const priority = calculatePriority('Any content', 'theory', true);
    expect(priority).toBe(10);
  });
  
  it('should assign priority 9 to module overviews', () => {
    const priority = calculatePriority('Module overview content', 'module_overview', false);
    expect(priority).toBe(9);
  });
  
  it('should assign priority 8 to safety content', () => {
    const priority = calculatePriority('Safety content', 'safety', false);
    expect(priority).toBe(8);
  });
  
  it('should assign priority 7 to definitions', () => {
    const priority = calculatePriority('Definition content', 'definition', false);
    expect(priority).toBe(7);
  });
  
  it('should assign priority 6 to theory and practical', () => {
    const theoryPriority = calculatePriority('Theory content', 'theory', false);
    const practicalPriority = calculatePriority('Practical content', 'practical', false);
    
    expect(theoryPriority).toBe(6);
    expect(practicalPriority).toBe(6);
  });
  
  it('should assign priority 5 to tools', () => {
    const priority = calculatePriority('Tools content', 'tools', false);
    expect(priority).toBe(5);
  });
  
  it('should assign priority 4 to examples', () => {
    const priority = calculatePriority('Example content', 'example', false);
    expect(priority).toBe(4);
  });
  
  it('should boost priority for substantial content', () => {
    const shortContent = 'Short content';
    const longContent = 'x'.repeat(2500); // > 2000 chars
    
    const shortPriority = calculatePriority(shortContent, 'theory', false);
    const longPriority = calculatePriority(longContent, 'theory', false);
    
    expect(longPriority).toBe(shortPriority + 1);
  });
  
  it('should cap priority at 10', () => {
    const veryLongContent = 'x'.repeat(5000);
    const priority = calculatePriority(veryLongContent, 'safety', false);
    
    expect(priority).toBeLessThanOrEqual(10);
  });
  
  it('should default to priority 5 for unknown types', () => {
    const priority = calculatePriority('Content', 'unknown_type', false);
    expect(priority).toBe(5);
  });
});

describe('Content Classification - Keyword Extraction', () => {
  it('should extract keywords from text', () => {
    const text = 'Electrical safety is important. Always use proper safety equipment when working with electrical circuits.';
    const keywords = extractKeywords(text);
    
    expect(Array.isArray(keywords)).toBe(true);
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords.length).toBeLessThanOrEqual(10);
  });
  
  it('should filter out short words', () => {
    const text = 'The cat sat on the mat with a big dog';
    const keywords = extractKeywords(text);
    
    // Words like 'the', 'cat', 'sat', 'on', 'mat', 'big', 'dog' should be filtered (length <= 4)
    keywords.forEach(keyword => {
      expect(keyword.length).toBeGreaterThan(4);
    });
  });
  
  it('should return most frequent words', () => {
    const text = 'electrical electrical electrical safety safety circuit';
    const keywords = extractKeywords(text);
    
    // 'electrical' appears 3 times, should be first
    expect(keywords[0]).toBe('electrical');
  });
  
  it('should limit to 10 keywords', () => {
    const text = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 '.repeat(10);
    const keywords = extractKeywords(text);
    
    expect(keywords.length).toBeLessThanOrEqual(10);
  });
  
  it('should handle empty text', () => {
    const keywords = extractKeywords('');
    expect(Array.isArray(keywords)).toBe(true);
    expect(keywords.length).toBe(0);
  });
  
  it('should handle text with punctuation', () => {
    const text = 'Safety! Equipment? Electrical. Circuit, Voltage; Current:';
    const keywords = extractKeywords(text);
    
    expect(Array.isArray(keywords)).toBe(true);
    keywords.forEach(keyword => {
      expect(keyword).toMatch(/^[a-z]+$/); // Only lowercase letters
    });
  });
  
  it('should be case-insensitive', () => {
    const text = 'ELECTRICAL Electrical electrical SAFETY Safety safety';
    const keywords = extractKeywords(text);
    
    // Should count all variations as same word
    expect(keywords).toContain('electrical');
    expect(keywords).toContain('safety');
  });
  
  it('should handle technical terms', () => {
    const text = 'voltage current resistance capacitance inductance impedance reactance';
    const keywords = extractKeywords(text);
    
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords).toContain('voltage');
    expect(keywords).toContain('current');
    expect(keywords).toContain('resistance');
  });
});

describe('Content Classification - Integration', () => {
  it('should classify and score safety content correctly', () => {
    const text = 'Safety precautions: Always wear PPE and follow lockout/tagout procedures';
    
    const type = classifyContentType(text);
    const priority = calculatePriority(text, type, false);
    const keywords = extractKeywords(text);
    
    expect(type).toBe('safety');
    expect(priority).toBe(8);
    expect(keywords).toContain('safety');
  });
  
  it('should classify and score theory content correctly', () => {
    const text = 'Ohms law is a fundamental principle that defines the relationship between voltage, current, and resistance';
    
    const type = classifyContentType(text);
    const priority = calculatePriority(text, type, false);
    const keywords = extractKeywords(text);
    
    expect(type).toBe('theory');
    expect(priority).toBe(6);
    expect(keywords.length).toBeGreaterThan(0);
  });
  
  it('should handle mixed content appropriately', () => {
    const text = 'This procedure involves using safety equipment to measure voltage with a multimeter';
    
    const type = classifyContentType(text);
    // Should match first pattern found (practical, safety, or tools)
    expect(['practical', 'safety', 'tools']).toContain(type);
  });
});
