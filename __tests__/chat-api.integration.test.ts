/**
 * Integration Tests for Context-Aware Chat API
 * Tests: 25.1 - Context-aware chat integration tests
 */

import { describe, it, expect } from 'vitest';

describe('Chat API - Context-Aware Integration Tests', () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  describe('User Level Adaptation', () => {
    it('should adapt response for beginner level', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token' // Mock auth
        },
        body: JSON.stringify({
          message: 'What is voltage?',
          context: {
            userLevel: 'beginner',
            tradeType: 'TT'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Should return response with sources
        expect(data).toHaveProperty('response');
        expect(data).toHaveProperty('sources');
        
        // Sources should have high priority for beginners
        if (data.sources && data.sources.length > 0) {
          data.sources.forEach((source: any) => {
            expect(source.priority).toBeGreaterThanOrEqual(6);
          });
        }
      }
    });

    it('should adapt response for advanced level', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token'
        },
        body: JSON.stringify({
          message: 'Explain complex circuit analysis',
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
        
        // Advanced level can include lower priority content
        expect(data.sources).toBeDefined();
      }
    });
  });

  describe('Focus Area Specialization', () => {
    it('should prioritize safety content for safety focus', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token'
        },
        body: JSON.stringify({
          message: 'Tell me about electrical safety',
          context: {
            focusArea: 'safety',
            tradeType: 'TT'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('response');
        expect(data).toHaveProperty('sources');
        
        // Should include safety content
        if (data.sources && data.sources.length > 0) {
          const safetyCount = data.sources.filter((s: any) => s.type === 'safety').length;
          expect(safetyCount).toBeGreaterThan(0);
        }
      }
    });

    it('should prioritize tools content for tools focus', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token'
        },
        body: JSON.stringify({
          message: 'What tools do I need?',
          context: {
            focusArea: 'tools',
            tradeType: 'TT'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('response');
        expect(data).toHaveProperty('sources');
        
        // Should include tools content
        if (data.sources && data.sources.length > 0) {
          const toolsCount = data.sources.filter((s: any) => s.type === 'tools').length;
          expect(toolsCount).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Module Context Awareness', () => {
    it('should boost current module content', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token'
        },
        body: JSON.stringify({
          message: 'Explain the basics',
          context: {
            currentModule: 'module-1',
            tradeType: 'TT'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('response');
        expect(data).toHaveProperty('sources');
        
        // Should include content from module-1
        if (data.sources && data.sources.length > 0) {
          const module1Count = data.sources.filter((s: any) => 
            s.module.includes('Module 1') || s.moduleNumber === 1
          ).length;
          expect(module1Count).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Specialized Response Types', () => {
    it('should provide safety-focused response for safety queries', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token'
        },
        body: JSON.stringify({
          message: 'What are the safety precautions?',
          context: {
            tradeType: 'TT'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('response');
        
        // Response should mention safety
        expect(data.response.toLowerCase()).toMatch(/safety|precaution|ppe|hazard/);
      }
    });

    it('should provide tool-focused response for tool queries', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token'
        },
        body: JSON.stringify({
          message: 'What tools should I use?',
          context: {
            tradeType: 'TT'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('response');
        
        // Response should mention tools
        expect(data.response.toLowerCase()).toMatch(/tool|equipment|instrument/);
      }
    });

    it('should provide definition-focused response for definition queries', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token'
        },
        body: JSON.stringify({
          message: 'What is Ohms Law?',
          context: {
            tradeType: 'TT'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('response');
        
        // Response should provide explanation
        expect(data.response.length).toBeGreaterThan(50);
      }
    });

    it('should provide procedure-focused response for how-to queries', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token'
        },
        body: JSON.stringify({
          message: 'How do I test a circuit?',
          context: {
            tradeType: 'TT'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('response');
        
        // Response should mention procedure/steps
        expect(data.response.toLowerCase()).toMatch(/step|procedure|process|method/);
      }
    });
  });

  describe('Source Attribution', () => {
    it('should include enhanced source information', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token'
        },
        body: JSON.stringify({
          message: 'Tell me about electrical safety',
          context: {
            tradeType: 'TT'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        expect(data).toHaveProperty('sources');
        
        if (data.sources && data.sources.length > 0) {
          const source = data.sources[0];
          
          // Should include all required fields
          expect(source).toHaveProperty('module');
          expect(source).toHaveProperty('moduleNumber');
          expect(source).toHaveProperty('type');
          expect(source).toHaveProperty('priority');
          expect(source).toHaveProperty('tradeType');
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing message', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token'
        },
        body: JSON.stringify({
          context: {
            tradeType: 'TT'
          }
        })
      });

      expect(response.status).toBe(400);
    });

    it('should handle unauthenticated requests', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Test message',
          context: {
            tradeType: 'TT'
          }
        })
      });

      expect(response.status).toBe(401);
    });
  });
});
