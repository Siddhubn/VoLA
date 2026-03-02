import { describe, it, expect, beforeEach } from 'vitest'
import {
  ModuleContextTracker,
  processTextWithModuleContext,
  logUndetectedModuleWarning,
} from '../module-context-tracker'

describe('Module Context Tracker', () => {
  let tracker: ModuleContextTracker
  
  beforeEach(() => {
    tracker = new ModuleContextTracker()
  })
  
  describe('ModuleContextTracker', () => {
    it('should start with default context', () => {
      const context = tracker.getCurrentContext()
      
      expect(context.moduleNumber).toBeNull()
      expect(context.moduleName).toBeNull()
      expect(context.fullModuleName).toBe('General Content')
    })
    
    it('should detect and update context when module header is found', () => {
      const isHeader = tracker.processLine('Module 1 - Safety Practice', 0)
      
      expect(isHeader).toBe(true)
      
      const context = tracker.getCurrentContext()
      expect(context.moduleNumber).toBe(1)
      expect(context.moduleName).toBe('Safety Practice')
      expect(context.fullModuleName).toBe('Module 1 - Safety Practice')
    })
    
    it('should not update context for non-header lines', () => {
      tracker.processLine('Module 1 - Safety Practice', 0)
      const contextBefore = tracker.getCurrentContext()
      
      const isHeader = tracker.processLine('This is regular content', 1)
      
      expect(isHeader).toBe(false)
      
      const contextAfter = tracker.getCurrentContext()
      expect(contextAfter).toEqual(contextBefore)
    })
    
    it('should update context when new module header is detected', () => {
      tracker.processLine('Module 1 - Safety Practice', 0)
      tracker.processLine('Some content', 1)
      tracker.processLine('Module 2 - Basic Theory', 2)
      
      const context = tracker.getCurrentContext()
      expect(context.moduleNumber).toBe(2)
      expect(context.moduleName).toBe('Basic Theory')
    })
    
    it('should track all detected headers', () => {
      tracker.processLine('Module 1 - Safety Practice', 0)
      tracker.processLine('Some content', 1)
      tracker.processLine('Module 2 - Basic Theory', 2)
      tracker.processLine('More content', 3)
      tracker.processLine('Module 3 - Workshop Technology', 4)
      
      const headers = tracker.getDetectedHeaders()
      
      expect(headers).toHaveLength(3)
      expect(headers[0].moduleNumber).toBe(1)
      expect(headers[1].moduleNumber).toBe(2)
      expect(headers[2].moduleNumber).toBe(3)
    })
    
    it('should associate chunks with current module context', () => {
      tracker.processLine('Module 1 - Safety Practice', 0)
      
      const chunk = tracker.associateChunk('This is safety content', 1)
      
      expect(chunk.content).toBe('This is safety content')
      expect(chunk.module).toBe('module-1-safety-practice')
      expect(chunk.moduleName).toBe('Module 1 - Safety Practice')
      expect(chunk.moduleNumber).toBe(1)
      expect(chunk.lineIndex).toBe(1)
    })
    
    it('should associate chunks with default context when no module detected', () => {
      const chunk = tracker.associateChunk('Some content', 0)
      
      expect(chunk.module).toBe('general-content')
      expect(chunk.moduleName).toBe('General Content')
      expect(chunk.moduleNumber).toBeNull()
    })
    
    it('should provide correct module ID', () => {
      tracker.processLine('Module 1 - Safety Practice', 0)
      
      expect(tracker.getCurrentModuleId()).toBe('module-1-safety-practice')
    })
    
    it('should reset to initial state', () => {
      tracker.processLine('Module 1 - Safety Practice', 0)
      tracker.processLine('Module 2 - Basic Theory', 1)
      
      tracker.reset()
      
      const context = tracker.getCurrentContext()
      expect(context.moduleNumber).toBeNull()
      expect(tracker.getDetectedHeaders()).toHaveLength(0)
    })
    
    it('should provide statistics about detected modules', () => {
      tracker.processLine('Module 1 - Safety Practice', 0)
      tracker.processLine('Module 2 - Basic Theory', 2)
      tracker.processLine('Module 1 - Safety Practice', 4) // Duplicate
      tracker.processLine('Module 3 - Workshop', 6)
      
      const stats = tracker.getStatistics()
      
      expect(stats.totalModules).toBe(3)
      expect(stats.moduleNumbers).toEqual([1, 2, 3])
      expect(stats.hasDefaultContent).toBe(false)
    })
  })
  
  describe('processTextWithModuleContext', () => {
    it('should process text and associate chunks with modules', () => {
      const text = `
Introduction content

Module 1 - Safety Practice
This is safety content.
More safety information.

Module 2 - Basic Theory
This is theory content.
More theory information.
      `.trim()
      
      const chunks = processTextWithModuleContext(text, 500)
      
      expect(chunks.length).toBeGreaterThan(0)
      
      // First chunk should be general content (before first module)
      expect(chunks[0].module).toBe('general-content')
      
      // Subsequent chunks should be associated with modules
      const safetyChunks = chunks.filter(c => c.module === 'module-1-safety-practice')
      const theoryChunks = chunks.filter(c => c.module === 'module-2-basic-theory')
      
      expect(safetyChunks.length).toBeGreaterThan(0)
      expect(theoryChunks.length).toBeGreaterThan(0)
    })
    
    it('should handle text without module headers', () => {
      const text = `
This is just regular content.
No module headers here.
Just plain text.
      `.trim()
      
      const chunks = processTextWithModuleContext(text, 500)
      
      expect(chunks.length).toBeGreaterThan(0)
      chunks.forEach(chunk => {
        expect(chunk.module).toBe('general-content')
        expect(chunk.moduleNumber).toBeNull()
      })
    })
    
    it('should split large content into multiple chunks', () => {
      // Create multiple lines of content to ensure chunking works
      const lines = []
      for (let i = 0; i < 10; i++) {
        lines.push('A'.repeat(200)) // 200 chars per line
      }
      const longContent = lines.join('\n') // Total: 2000+ chars
      
      const text = `
Module 1 - Test Module
${longContent}
      `.trim()
      
      const chunks = processTextWithModuleContext(text, 500)
      
      // Should create multiple chunks for the long content
      const moduleChunks = chunks.filter(c => c.module === 'module-1-test-module')
      expect(moduleChunks.length).toBeGreaterThan(1)
    })
    
    it('should preserve line indices for chunks', () => {
      const text = `
Line 0
Line 1
Module 1 - Test
Line 3
Line 4
      `.trim()
      
      const chunks = processTextWithModuleContext(text, 500)
      
      chunks.forEach(chunk => {
        expect(chunk.lineIndex).toBeGreaterThanOrEqual(0)
      })
    })
  })
  
  describe('logUndetectedModuleWarning', () => {
    it('should log warning for chunks without module', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const chunk = {
        content: 'Test content',
        module: 'general-content',
        moduleName: 'General Content',
        moduleNumber: null,
        lineIndex: 5,
      }
      
      logUndetectedModuleWarning(chunk, 'test.pdf')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('line 5')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test.pdf')
      )
      
      consoleSpy.mockRestore()
    })
    
    it('should not log warning for chunks with module', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const chunk = {
        content: 'Test content',
        module: 'module-1-test',
        moduleName: 'Module 1 - Test',
        moduleNumber: 1,
        lineIndex: 5,
      }
      
      logUndetectedModuleWarning(chunk, 'test.pdf')
      
      expect(consoleSpy).not.toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })
})
