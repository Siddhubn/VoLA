import { describe, it, expect } from 'vitest'
import {
  validateChunk,
  isValidChunk,
  prepareChunkForStorage,
  createStorageChunk,
  type StorageChunk
} from '../chunk-storage'

describe('Chunk Storage', () => {
  describe('validateChunk', () => {
    it('should return no errors for valid chunk', () => {
      const chunk: StorageChunk = {
        content: 'Test content',
        course: 'electrician',
        trade_type: 'trade_theory',
        module: 'module-1',
        module_name: 'Module 1 - Safety',
        section: null,
        page_number: null,
        chunk_index: 0
      }
      
      const errors = validateChunk(chunk)
      expect(errors).toHaveLength(0)
    })
    
    it('should return error for missing content', () => {
      const chunk = {
        course: 'electrician' as const,
        trade_type: 'trade_theory' as const,
        module: 'module-1',
        module_name: 'Module 1',
        chunk_index: 0
      }
      
      const errors = validateChunk(chunk)
      expect(errors.some(e => e.field === 'content')).toBe(true)
    })
    
    it('should return error for empty content', () => {
      const chunk = {
        content: '   ',
        course: 'electrician' as const,
        trade_type: 'trade_theory' as const,
        module: 'module-1',
        module_name: 'Module 1',
        chunk_index: 0
      }
      
      const errors = validateChunk(chunk)
      expect(errors.some(e => e.field === 'content')).toBe(true)
    })
    
    it('should return error for missing course', () => {
      const chunk = {
        content: 'Test',
        trade_type: 'trade_theory' as const,
        module: 'module-1',
        module_name: 'Module 1',
        chunk_index: 0
      }
      
      const errors = validateChunk(chunk)
      expect(errors.some(e => e.field === 'course')).toBe(true)
    })
    
    it('should return error for invalid course', () => {
      const chunk = {
        content: 'Test',
        course: 'invalid' as any,
        trade_type: 'trade_theory' as const,
        module: 'module-1',
        module_name: 'Module 1',
        chunk_index: 0
      }
      
      const errors = validateChunk(chunk)
      expect(errors.some(e => e.field === 'course')).toBe(true)
    })
    
    it('should return error for missing trade_type', () => {
      const chunk = {
        content: 'Test',
        course: 'electrician' as const,
        module: 'module-1',
        module_name: 'Module 1',
        chunk_index: 0
      }
      
      const errors = validateChunk(chunk)
      expect(errors.some(e => e.field === 'trade_type')).toBe(true)
    })
    
    it('should return error for invalid trade_type', () => {
      const chunk = {
        content: 'Test',
        course: 'electrician' as const,
        trade_type: 'invalid' as any,
        module: 'module-1',
        module_name: 'Module 1',
        chunk_index: 0
      }
      
      const errors = validateChunk(chunk)
      expect(errors.some(e => e.field === 'trade_type')).toBe(true)
    })
    
    it('should return error for missing module', () => {
      const chunk = {
        content: 'Test',
        course: 'electrician' as const,
        trade_type: 'trade_theory' as const,
        module_name: 'Module 1',
        chunk_index: 0
      }
      
      const errors = validateChunk(chunk)
      expect(errors.some(e => e.field === 'module')).toBe(true)
    })
    
    it('should return error for missing module_name', () => {
      const chunk = {
        content: 'Test',
        course: 'electrician' as const,
        trade_type: 'trade_theory' as const,
        module: 'module-1',
        chunk_index: 0
      }
      
      const errors = validateChunk(chunk)
      expect(errors.some(e => e.field === 'module_name')).toBe(true)
    })
    
    it('should return error for missing chunk_index', () => {
      const chunk = {
        content: 'Test',
        course: 'electrician' as const,
        trade_type: 'trade_theory' as const,
        module: 'module-1',
        module_name: 'Module 1'
      }
      
      const errors = validateChunk(chunk)
      expect(errors.some(e => e.field === 'chunk_index')).toBe(true)
    })
    
    it('should return error for negative chunk_index', () => {
      const chunk = {
        content: 'Test',
        course: 'electrician' as const,
        trade_type: 'trade_theory' as const,
        module: 'module-1',
        module_name: 'Module 1',
        chunk_index: -1
      }
      
      const errors = validateChunk(chunk)
      expect(errors.some(e => e.field === 'chunk_index')).toBe(true)
    })
    
    it('should return multiple errors for multiple missing fields', () => {
      const chunk = {
        content: ''
      }
      
      const errors = validateChunk(chunk)
      expect(errors.length).toBeGreaterThan(1)
    })
  })
  
  describe('isValidChunk', () => {
    it('should return true for valid chunk', () => {
      const chunk: StorageChunk = {
        content: 'Test content',
        course: 'electrician',
        trade_type: 'trade_theory',
        module: 'module-1',
        module_name: 'Module 1',
        section: null,
        page_number: null,
        chunk_index: 0
      }
      
      expect(isValidChunk(chunk)).toBe(true)
    })
    
    it('should return false for invalid chunk', () => {
      const chunk = {
        content: 'Test'
      }
      
      expect(isValidChunk(chunk)).toBe(false)
    })
  })
  
  describe('prepareChunkForStorage', () => {
    it('should return chunk for valid data', () => {
      const chunk = {
        content: 'Test content',
        course: 'electrician' as const,
        trade_type: 'trade_theory' as const,
        module: 'module-1',
        module_name: 'Module 1',
        section: null,
        page_number: null,
        chunk_index: 0
      }
      
      const result = prepareChunkForStorage(chunk)
      expect(result).toEqual(chunk)
    })
    
    it('should throw error for invalid chunk', () => {
      const chunk = {
        content: 'Test'
      }
      
      expect(() => prepareChunkForStorage(chunk)).toThrow('Chunk validation failed')
    })
  })
  
  describe('createStorageChunk', () => {
    it('should create chunk with all required fields', () => {
      const chunk = createStorageChunk({
        content: 'Test content',
        course: 'electrician',
        trade_type: 'trade_theory',
        module: 'module-1',
        module_name: 'Module 1 - Safety',
        chunk_index: 0
      })
      
      expect(chunk.content).toBe('Test content')
      expect(chunk.course).toBe('electrician')
      expect(chunk.trade_type).toBe('trade_theory')
      expect(chunk.module).toBe('module-1')
      expect(chunk.module_name).toBe('Module 1 - Safety')
      expect(chunk.section).toBeNull()
      expect(chunk.page_number).toBeNull()
      expect(chunk.chunk_index).toBe(0)
    })
    
    it('should create chunk with optional fields', () => {
      const chunk = createStorageChunk({
        content: 'Test content',
        course: 'fitter',
        trade_type: 'trade_practical',
        module: 'module-2',
        module_name: 'Module 2',
        section: 'Section 2.1',
        page_number: 42,
        chunk_index: 5
      })
      
      expect(chunk.section).toBe('Section 2.1')
      expect(chunk.page_number).toBe(42)
    })
  })
})
