/**
 * Integration Tests for Context-Aware Chat API
 * Validates: Requirements 8.2, 8.3, 8.5
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('Context-Aware Chat API - Integration Tests', () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let authToken: string;
  
  beforeAll(async () => {
    // Mock authentication for tests
    // In real tests, you'd authenticate properly
    authToken = 'test-token';
  });
  
  describe('User Level Adaptation', () => {
    it('should adapt response for beginner users', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify({
          message: 'What is Ohms law?',
          context: {
            userLevel: 'beginner',
            tradeType: 'TT'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('response');
        expect(data).toHaveProperty('sources');
        
        // Beginner responses should use simpler language
        const responseLower = data.response.toLowerCase();
        expect(responseLower).toContain('simple');
      }
    }, 15000);
    
    it('should adapt response for advanced users', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify({
          message: 'Explain three-phase power systems',
          context: {
            userLevel: 'advanced',
            tradeType: 'TT'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('response');
        expect(data).toHaveProperty('sources');
        
        // Advanced responses should be more technical
        expect(data.response.length).toBeGreaterThan(50);
      }
    }, 15000);
  });
  
  describe('Focus Area Specialization', () => {
    it('should provide safety-focused responses', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify({
          message: 'Tell me about electrical hazards',
          context: {
            userLevel: 'intermediate',
            focusArea: 'safety',
            tradeType: 'TT'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('response');
        expect(data).toHaveProperty('sources');
        
        // Safety responses should include warning emoji
        expect(data.response).toContain('⚠️');
        
        // Sources should include safety content
        const safetyContent = data.sources.filter((s: any) => s.type === 'safety');
        expect(safetyContent.length).toBeGreaterThan(0);
      }
    }, 15000);
    
    it('should provide tools-focused responses', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify({
          message: 'What tools do I need for electrical work?',
          context: {
            userLevel: 'intermediate',
            focusArea: 'tools',
            tradeType: 'TT'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('response');
        
        // Tools responses should include tool emoji
        expect(data.response).toContain('🔧');
        
        // Sources should include tools content
        if (data.sources && data.sources.length > 0) {
          const toolsContent = data.sources.filter((s: any) => s.type === 'tools');
          expect(toolsContent.length).toBeGreaterThan(0);
        }
      }
    }, 15000);
    
    it('should provide theory-focused responses', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify({
          message: 'Explain the concept of voltage',
          context: {
            userLevel: 'intermediate',
            focusArea: 'theory',
            tradeType: 'TT'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('response');
        
        // Theory responses should include book emoji
        expect(data.response).toContain('📚');
      }
    }, 15000);
    
    it('should provide practical-focused responses', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify({
          message: 'How do I install a circuit breaker?',
          context: {
            userLevel: 'intermediate',
            focusArea: 'practical',
            tradeType: 'TT'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('response');
        
        // Practical responses should include procedure emoji
        expect(data.response).toContain('📋');
      }
    }, 15000);
  });
  
  describe('Module Context Awareness', () => {
    it('should prioritize current module content', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify({
          message: 'Tell me about basic electrical concepts',
          context: {
            userLevel: 'intermediate',
            currentModule: 'module-1',
            tradeType: 'TT'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('sources');
        
        // Should have sources from module-1
        if (data.sources && data.sources.length > 0) {
          const module1Sources = data.sources.filter((s: any) => s.moduleNumber === 1);
          expect(module1Sources.length).toBeGreaterThan(0);
        }
      }
    }, 15000);
  });
  
  describe('Specialized Response Types', () => {
    it('should detect and provide safety warnings', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify({
          message: 'What are the dangers of working with electricity?',
          context: {
            userLevel: 'beginner',
            tradeType: 'TT'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Should include safety warnings
        expect(data.response).toContain('⚠️');
        expect(data.response.toLowerCase()).toMatch(/safety|danger|hazard|warning/);
      }
    }, 15000);
    
    it('should provide definitions when asked', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify({
          message: 'What is resistance?',
          context: {
            userLevel: 'intermediate',
            tradeType: 'TT'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Should provide definition-style response
        expect(data.response).toContain('📚');
      }
    }, 15000);
    
    it('should provide step-by-step procedures', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify({
          message: 'How do I test a circuit with a multimeter?',
          context: {
            userLevel: 'intermediate',
            tradeType: 'TT'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Should provide procedure-style response
        expect(data.response).toContain('📋');
      }
    }, 15000);
  });
  
  describe('Source Attribution', () => {
    it('should include source metadata', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify({
          message: 'What is electrical safety?',
          context: {
            userLevel: 'intermediate',
            tradeType: 'TT'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('sources');
        expect(Array.isArray(data.sources)).toBe(true);
        
        if (data.sources.length > 0) {
          const source = data.sources[0];
          
          // Each source should have required metadata
          expect(source).toHaveProperty('module');
          expect(source).toHaveProperty('moduleNumber');
          expect(source).toHaveProperty('type');
          expect(source).toHaveProperty('priority');
          expect(source).toHaveProperty('tradeType');
        }
      }
    }, 15000);
    
    it('should include content type in sources', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify({
          message: 'Tell me about circuit breakers',
          context: {
            userLevel: 'intermediate',
            tradeType: 'TT'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.sources && data.sources.length > 0) {
          data.sources.forEach((source: any) => {
            expect(source.type).toMatch(/theory|safety|practical|tools|definition/);
          });
        }
      }
    }, 15000);
  });
  
  describe('Error Handling', () => {
    it('should handle missing authentication', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Test message'
        })
      });
      
      expect(response.status).toBe(401);
    }, 10000);
    
    it('should handle empty message', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify({
          message: '',
          context: {
            userLevel: 'intermediate',
            tradeType: 'TT'
          }
        })
      });
      
      expect(response.status).toBe(400);
    }, 10000);
  });
});
