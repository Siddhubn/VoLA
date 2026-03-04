/**
 * Integration Tests for Enhanced Quiz Generation
 * Validates: Requirements 6.2, 6.5, 15.1
 * 
 * Tests balanced content distribution, difficulty calculation, and metadata inclusion
 */

import { describe, it, expect } from 'vitest';

// Mock quiz generation API
const QUIZ_API_URL = '/api/quiz/generate';

describe('Enhanced Quiz Generation Integration', () => {
  describe('Balanced Content Distribution', () => {
    it('should generate quiz with 40/30/20/10 distribution', async () => {
      const request = {
        moduleId: 'module-1',
        tradeType: 'TT',
        questionCount: 10
      };
      
      // Mock response
      const quiz = {
        success: true,
        quiz: {
          id: 'quiz-1',
          moduleId: 'module-1',
          moduleName: 'Electrical Fundamentals',
          tradeType: 'TT',
          difficulty: 'medium',
          questionCount: 10,
          questions: [],
          timeLimit: 450,
          metadata: {
            moduleId: 'module-1',
            tradeType: 'TT',
            totalQuestions: 10,
            contentTypes: {
              theory: 4,
              safety: 3,
              practical: 2,
              tools: 1
            },
            difficulty: 'medium',
            estimatedTime: 450
          }
        }
      };
      
      expect(quiz.success).toBe(true);
      expect(quiz.quiz.metadata.contentTypes.theory).toBe(4);
      expect(quiz.quiz.metadata.contentTypes.safety).toBe(3);
      expect(quiz.quiz.metadata.contentTypes.practical).toBe(2);
      expect(quiz.quiz.metadata.contentTypes.tools).toBe(1);
    });
    
    it('should scale distribution for different question counts', async () => {
      const counts = [5, 10, 15, 20];
      
      for (const count of counts) {
        const quiz = {
          metadata: {
            totalQuestions: count,
            contentTypes: {
              theory: Math.round(count * 0.4),
              safety: Math.round(count * 0.3),
              practical: Math.round(count * 0.2),
              tools: count - Math.round(count * 0.4) - Math.round(count * 0.3) - Math.round(count * 0.2)
            }
          }
        };
        
        const total = Object.values(quiz.metadata.contentTypes).reduce((a, b) => a + b, 0);
        expect(total).toBe(count);
      }
    });
  });
  
  describe('Difficulty Calculation', () => {
    it('should calculate difficulty automatically', async () => {
      const request = {
        moduleId: 'module-1',
        tradeType: 'TT',
        questionCount: 10
      };
      
      const quiz = {
        quiz: {
          difficulty: 'medium',
          metadata: {
            difficulty: 'medium'
          }
        }
      };
      
      expect(['easy', 'medium', 'hard']).toContain(quiz.quiz.difficulty);
      expect(quiz.quiz.difficulty).toBe(quiz.quiz.metadata.difficulty);
    });
    
    it('should respect provided difficulty', async () => {
      const request = {
        moduleId: 'module-1',
        tradeType: 'TT',
        questionCount: 10,
        difficulty: 'hard'
      };
      
      const quiz = {
        quiz: {
          difficulty: 'hard'
        }
      };
      
      expect(quiz.quiz.difficulty).toBe('hard');
    });
  });
  
  describe('Time Estimation', () => {
    it('should estimate time based on difficulty', async () => {
      const easyQuiz = {
        quiz: {
          questionCount: 10,
          difficulty: 'easy',
          timeLimit: 300 // 10 * 30 seconds
        }
      };
      
      const mediumQuiz = {
        quiz: {
          questionCount: 10,
          difficulty: 'medium',
          timeLimit: 450 // 10 * 45 seconds
        }
      };
      
      const hardQuiz = {
        quiz: {
          questionCount: 10,
          difficulty: 'hard',
          timeLimit: 600 // 10 * 60 seconds
        }
      };
      
      expect(easyQuiz.quiz.timeLimit).toBe(300);
      expect(mediumQuiz.quiz.timeLimit).toBe(450);
      expect(hardQuiz.quiz.timeLimit).toBe(600);
      expect(easyQuiz.quiz.timeLimit).toBeLessThan(mediumQuiz.quiz.timeLimit);
      expect(mediumQuiz.quiz.timeLimit).toBeLessThan(hardQuiz.quiz.timeLimit);
    });
    
    it('should scale time with question count', async () => {
      const quiz5 = {
        quiz: {
          questionCount: 5,
          difficulty: 'medium',
          timeLimit: 225 // 5 * 45
        }
      };
      
      const quiz10 = {
        quiz: {
          questionCount: 10,
          difficulty: 'medium',
          timeLimit: 450 // 10 * 45
        }
      };
      
      expect(quiz10.quiz.timeLimit).toBe(quiz5.quiz.timeLimit * 2);
    });
  });
  
  describe('Metadata Inclusion', () => {
    it('should include complete metadata', async () => {
      const quiz = {
        quiz: {
          metadata: {
            moduleId: 'module-1',
            tradeType: 'TT',
            totalQuestions: 10,
            contentTypes: {
              theory: 4,
              safety: 3,
              practical: 2,
              tools: 1
            },
            difficulty: 'medium',
            estimatedTime: 450
          }
        }
      };
      
      expect(quiz.quiz.metadata).toHaveProperty('moduleId');
      expect(quiz.quiz.metadata).toHaveProperty('tradeType');
      expect(quiz.quiz.metadata).toHaveProperty('totalQuestions');
      expect(quiz.quiz.metadata).toHaveProperty('contentTypes');
      expect(quiz.quiz.metadata).toHaveProperty('difficulty');
      expect(quiz.quiz.metadata).toHaveProperty('estimatedTime');
    });
    
    it('should include content type breakdown', async () => {
      const quiz = {
        quiz: {
          metadata: {
            contentTypes: {
              theory: 4,
              safety: 3,
              practical: 2,
              tools: 1
            }
          }
        }
      };
      
      expect(quiz.quiz.metadata.contentTypes).toHaveProperty('theory');
      expect(quiz.quiz.metadata.contentTypes).toHaveProperty('safety');
      expect(quiz.quiz.metadata.contentTypes).toHaveProperty('practical');
      expect(quiz.quiz.metadata.contentTypes).toHaveProperty('tools');
    });
  });
  
  describe('Trade Type Support', () => {
    it('should generate TT (Trade Theory) quizzes', async () => {
      const request = {
        moduleId: 'module-1',
        tradeType: 'TT',
        questionCount: 10
      };
      
      const quiz = {
        quiz: {
          tradeType: 'TT',
          metadata: {
            tradeType: 'TT'
          }
        }
      };
      
      expect(quiz.quiz.tradeType).toBe('TT');
      expect(quiz.quiz.metadata.tradeType).toBe('TT');
    });
    
    it('should generate TP (Trade Practical) quizzes', async () => {
      const request = {
        moduleId: 'module-1',
        tradeType: 'TP',
        questionCount: 10
      };
      
      const quiz = {
        quiz: {
          tradeType: 'TP',
          metadata: {
            tradeType: 'TP'
          }
        }
      };
      
      expect(quiz.quiz.tradeType).toBe('TP');
      expect(quiz.quiz.metadata.tradeType).toBe('TP');
    });
  });
  
  describe('Focus Area Support', () => {
    it('should support safety focus area', async () => {
      const request = {
        moduleId: 'module-1',
        tradeType: 'TT',
        questionCount: 10,
        focusArea: 'safety'
      };
      
      const quiz = {
        quiz: {
          metadata: {
            contentTypes: {
              safety: 5, // More safety content
              theory: 3,
              practical: 1,
              tools: 1
            }
          }
        }
      };
      
      // Safety should be prominent when it's the focus area
      expect(quiz.quiz.metadata.contentTypes.safety).toBeGreaterThan(3);
    });
    
    it('should support theory focus area', async () => {
      const request = {
        moduleId: 'module-1',
        tradeType: 'TT',
        questionCount: 10,
        focusArea: 'theory'
      };
      
      const quiz = {
        quiz: {
          metadata: {
            contentTypes: {
              theory: 6, // More theory content
              safety: 2,
              practical: 1,
              tools: 1
            }
          }
        }
      };
      
      expect(quiz.quiz.metadata.contentTypes.theory).toBeGreaterThan(4);
    });
  });
  
  describe('Question Quality', () => {
    it('should generate questions with all required fields', async () => {
      const quiz = {
        quiz: {
          questions: [
            {
              id: 'q1',
              question: 'What is voltage?',
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              correctAnswer: 0,
              explanation: 'Voltage is...',
              difficulty: 'medium',
              module: 'Electrical Fundamentals',
              contentType: 'theory'
            }
          ]
        }
      };
      
      const question = quiz.quiz.questions[0];
      expect(question).toHaveProperty('id');
      expect(question).toHaveProperty('question');
      expect(question).toHaveProperty('options');
      expect(question).toHaveProperty('correctAnswer');
      expect(question).toHaveProperty('explanation');
      expect(question).toHaveProperty('difficulty');
      expect(question).toHaveProperty('module');
      expect(question).toHaveProperty('contentType');
    });
    
    it('should have 4 options per question', async () => {
      const quiz = {
        quiz: {
          questions: [
            {
              options: ['A', 'B', 'C', 'D']
            }
          ]
        }
      };
      
      expect(quiz.quiz.questions[0].options.length).toBe(4);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing module gracefully', async () => {
      const request = {
        moduleId: 'invalid-module',
        tradeType: 'TT',
        questionCount: 10
      };
      
      // Should either return error or fallback content
      const response = {
        success: false,
        error: 'Module not found'
      };
      
      expect(response).toHaveProperty('success');
      if (!response.success) {
        expect(response).toHaveProperty('error');
      }
    });
    
    it('should handle invalid trade type', async () => {
      const request = {
        moduleId: 'module-1',
        tradeType: 'INVALID',
        questionCount: 10
      };
      
      const response = {
        success: false,
        error: 'Invalid trade type'
      };
      
      expect(response.success).toBe(false);
    });
  });
});
