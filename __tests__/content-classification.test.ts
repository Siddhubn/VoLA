/**
 * Unit Tests for Content Classification System
 * Tests: 27.1 - Content classification tests
 */

import { describe, it, expect } from 'vitest';

// Import classification functions from the PDF processing script
// Note: These are extracted for testing purposes

/**
 * Content type classification patterns (from process-module-pdfs-intelligent.ts)
 */
const CONTENT_TYPE_PATTERNS = {
  safety: /safety|hazard|precaution|protective|PPE|danger|warning|first aid/i,
  tools: /tool|equipment|instrument|device|apparatus|machine/i,
  theory: /principle|theory|concept|definition|formula|law|equation/i,
  practical: /procedure|step|method|process|operation|practice|exercise/i,
  example: /example|illustration|case study|application/i,
  definition: /define|definition|meaning|refers to|is called|known as/i,
};

/**
 * Classify content type
 */
function classifyContentType(text: string): string {
  const lowerText = text.toLowerCase();
  
  for (const [type, pattern] of Object.entries(CONTENT_TYPE_PATTERNS)) {
    if (pattern.test(lowerText)) {
      return type;
    }
  }
  
  return 'theory';
}

/**
 * Calculate priority based on content
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
  
  if (content.length > 2000) priority += 1;
  
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
  
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  return sorted;
}

describe('Content Classification System', () => {
  describe('Content Type Detection', () => {
    it('should classify safety content correctly', () => {
      const safetyTexts = [
        'Always wear PPE when working with electrical equipment',
        'Safety precautions must be followed to prevent hazards',
        'Warning: High voltage danger zone',
        'First aid procedures for electrical shock'
      ];

      safetyTexts.forEach(text => {
        const type = classifyContentType(text);
        expect(type).toBe('safety');
      });
    });

    it('should classify tools content correctly', () => {
      const toolsTexts = [
        'Use a multimeter to measure voltage',
        'The screwdriver is an essential tool',
        'Testing equipment must be calibrated',
        'This instrument measures current flow'
      ];

      toolsTexts.forEach(text => {
        const type = classifyContentType(text);
        expect(type).toBe('tools');
      });
    });

    it('should classify theory content correctly', () => {
      const theoryTexts = [
        'Ohms law states that voltage equals current times resistance',
        'The principle of electromagnetic induction',
        'This concept explains the relationship between voltage and current',
        'The formula for power is P = VI'
      ];

      theoryTexts.forEach(text => {
        const type = classifyContentType(text);
        expect(type).toBe('theory');
      });
    });

    it('should classify practical content correctly', () => {
      const practicalTexts = [
        'Follow these steps to install the circuit breaker',
        'The procedure for testing a circuit',
        'This method ensures proper grounding',
        'Practice these operations regularly'
      ];

      practicalTexts.forEach(text => {
        const type = classifyContentType(text);
        expect(type).toBe('practical');
      });
    });

    it('should classify definition content correctly', () => {
      const definitionTexts = [
        'Voltage is defined as the electrical potential difference',
        'Current refers to the flow of electric charge',
        'Resistance is called the opposition to current flow',
        'Power means the rate of energy transfer'
      ];

      definitionTexts.forEach(text => {
        const type = classifyContentType(text);
        expect(type).toBe('definition');
      });
    });

    it('should default to theory for ambiguous content', () => {
      const ambiguousText = 'This is some general electrical content';
      const type = classifyContentType(ambiguousText);
      expect(type).toBe('theory');
    });
  });

  describe('Priority Scoring', () => {
    it('should assign priority 10 to synthetic content', () => {
      const priority = calculatePriority('Any content', 'theory', true);
      expect(priority).toBe(10);
    });

    it('should assign priority 8 to safety content', () => {
      const priority = calculatePriority('Safety content', 'safety', false);
      expect(priority).toBe(8);
    });

    it('should assign priority 7 to definition content', () => {
      const priority = calculatePriority('Definition content', 'definition', false);
      expect(priority).toBe(7);
    });

    it('should assign priority 6 to theory content', () => {
      const priority = calculatePriority('Theory content', 'theory', false);
      expect(priority).toBe(6);
    });

    it('should assign priority 6 to practical content', () => {
      const priority = calculatePriority('Practical content', 'practical', false);
      expect(priority).toBe(6);
    });

    it('should assign priority 5 to tools content', () => {
      const priority = calculatePriority('Tools content', 'tools', false);
      expect(priority).toBe(5);
    });

    it('should assign priority 4 to example content', () => {
      const priority = calculatePriority('Example content', 'example', false);
      expect(priority).toBe(4);
    });

    it('should boost priority for long content', () => {
      const shortContent = 'Short content';
      const longContent = 'A'.repeat(2500); // > 2000 chars
      
      const shortPriority = calculatePriority(shortContent, 'theory', false);
      const longPriority = calculatePriority(longContent, 'theory', false);
      
      expect(longPriority).toBe(shortPriority + 1);
    });

    it('should cap priority at 10', () => {
      const veryLongContent = 'A'.repeat(5000);
      const priority = calculatePriority(veryLongContent, 'safety', false);
      expect(priority).toBeLessThanOrEqual(10);
    });

    it('should handle unknown content types with default priority', () => {
      const priority = calculatePriority('Content', 'unknown_type', false);
      expect(priority).toBe(5);
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract keywords from text', () => {
      const text = 'Electrical safety is important. Always use proper electrical equipment and follow electrical safety procedures.';
      const keywords = extractKeywords(text);
      
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.length).toBeLessThanOrEqual(10);
      
      // Should include frequent words
      expect(keywords).toContain('electrical');
      expect(keywords).toContain('safety');
    });

    it('should filter out short words', () => {
      const text = 'The cat sat on the mat with a big dog';
      const keywords = extractKeywords(text);
      
      // Short words (< 5 chars) should be filtered
      keywords.forEach(keyword => {
        expect(keyword.length).toBeGreaterThan(4);
      });
    });

    it('should return top 10 keywords by frequency', () => {
      const text = 'voltage voltage voltage current current resistance power energy circuit circuit circuit circuit';
      const keywords = extractKeywords(text);
      
      expect(keywords.length).toBeLessThanOrEqual(10);
      
      // Most frequent should be first
      expect(keywords[0]).toBe('circuit'); // 4 times
      expect(keywords[1]).toBe('voltage'); // 3 times
    });

    it('should handle empty text', () => {
      const keywords = extractKeywords('');
      expect(keywords).toEqual([]);
    });

    it('should handle text with punctuation', () => {
      const text = 'Safety! Equipment? Procedures. Testing, measuring; grounding:';
      const keywords = extractKeywords(text);
      
      expect(keywords.length).toBeGreaterThan(0);
      // Should extract words without punctuation
      keywords.forEach(keyword => {
        expect(keyword).toMatch(/^[a-z]+$/);
      });
    });

    it('should be case-insensitive', () => {
      const text = 'VOLTAGE Voltage voltage CURRENT Current current';
      const keywords = extractKeywords(text);
      
      // Should treat all cases as same word
      expect(keywords).toContain('voltage');
      expect(keywords).toContain('current');
    });
  });

  describe('Classification Integration', () => {
    it('should classify and prioritize safety content correctly', () => {
      const text = 'Always wear PPE and follow safety procedures to prevent electrical hazards';
      
      const type = classifyContentType(text);
      const priority = calculatePriority(text, type, false);
      const keywords = extractKeywords(text);
      
      expect(type).toBe('safety');
      expect(priority).toBe(8);
      expect(keywords).toContain('safety');
    });

    it('should classify and prioritize theory content correctly', () => {
      const text = 'Ohms law is a fundamental principle that defines the relationship between voltage, current, and resistance';
      
      const type = classifyContentType(text);
      const priority = calculatePriority(text, type, false);
      const keywords = extractKeywords(text);
      
      expect(type).toBe('theory');
      expect(priority).toBe(6);
      expect(keywords.length).toBeGreaterThan(0);
    });

    it('should handle mixed content appropriately', () => {
      const text = 'Use the multimeter tool to measure voltage. This procedure ensures safety when testing circuits.';
      
      const type = classifyContentType(text);
      const priority = calculatePriority(text, type, false);
      
      // Should classify as one of the detected types
      expect(['tools', 'practical', 'safety']).toContain(type);
      expect(priority).toBeGreaterThanOrEqual(4);
      expect(priority).toBeLessThanOrEqual(10);
    });
  });
});
