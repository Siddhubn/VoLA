import { describe, it, expect } from 'vitest'
import {
  detectModuleHeader,
  extractModuleHeaders,
  createModuleContext,
  moduleContextToId,
  getDefaultModuleContext,
} from '../module-header-detector'

describe('Module Header Detector', () => {
  describe('detectModuleHeader', () => {
    it('should detect Pattern 1: Module \\d+ - .+', () => {
      const result = detectModuleHeader('Module 1 - Safety Practice and Hand Tools')
      
      expect(result).not.toBeNull()
      expect(result?.moduleNumber).toBe(1)
      expect(result?.moduleName).toBe('Safety Practice and Hand Tools')
      expect(result?.fullHeader).toBe('Module 1 - Safety Practice and Hand Tools')
    })
    
    it('should detect Pattern 2: Module \\d+: .+', () => {
      const result = detectModuleHeader('Module 2: Basic Electrical Theory')
      
      expect(result).not.toBeNull()
      expect(result?.moduleNumber).toBe(2)
      expect(result?.moduleName).toBe('Basic Electrical Theory')
      expect(result?.fullHeader).toBe('Module 2: Basic Electrical Theory')
    })
    
    it('should detect Pattern 3: MODULE \\d+ .+ (case insensitive)', () => {
      const result = detectModuleHeader('MODULE 3 Workshop Technology')
      
      expect(result).not.toBeNull()
      expect(result?.moduleNumber).toBe(3)
      expect(result?.moduleName).toBe('Workshop Technology')
      expect(result?.fullHeader).toBe('MODULE 3 Workshop Technology')
    })
    
    it('should handle lowercase module headers', () => {
      const result = detectModuleHeader('module 4 - Fitting Operations')
      
      expect(result).not.toBeNull()
      expect(result?.moduleNumber).toBe(4)
      expect(result?.moduleName).toBe('Fitting Operations')
    })
    
    it('should handle extra whitespace', () => {
      const result = detectModuleHeader('  Module  5  -  Maintenance   ')
      
      expect(result).not.toBeNull()
      expect(result?.moduleNumber).toBe(5)
      expect(result?.moduleName).toBe('Maintenance')
    })
    
    it('should return null for non-module headers', () => {
      expect(detectModuleHeader('This is just regular text')).toBeNull()
      expect(detectModuleHeader('Chapter 1 - Introduction')).toBeNull()
      expect(detectModuleHeader('Section 2.1')).toBeNull()
      expect(detectModuleHeader('')).toBeNull()
    })
    
    it('should handle multi-digit module numbers', () => {
      const result = detectModuleHeader('Module 12 - Advanced Topics')
      
      expect(result).not.toBeNull()
      expect(result?.moduleNumber).toBe(12)
      expect(result?.moduleName).toBe('Advanced Topics')
    })
  })
  
  describe('extractModuleHeaders', () => {
    it('should extract multiple module headers from text', () => {
      const text = `
Introduction to the course

Module 1 - Safety Practice and Hand Tools
This module covers safety procedures.

Some content here.

Module 2: Basic Electrical Theory
This module covers electrical fundamentals.

More content.

MODULE 3 Workshop Technology
This covers workshop operations.
      `
      
      const headers = extractModuleHeaders(text)
      
      expect(headers).toHaveLength(3)
      expect(headers[0].moduleNumber).toBe(1)
      expect(headers[0].moduleName).toBe('Safety Practice and Hand Tools')
      expect(headers[1].moduleNumber).toBe(2)
      expect(headers[1].moduleName).toBe('Basic Electrical Theory')
      expect(headers[2].moduleNumber).toBe(3)
      expect(headers[2].moduleName).toBe('Workshop Technology')
    })
    
    it('should return empty array for text without module headers', () => {
      const text = 'This is just regular content without any module headers.'
      const headers = extractModuleHeaders(text)
      
      expect(headers).toHaveLength(0)
    })
    
    it('should set correct line indices', () => {
      const text = `Line 0
Line 1
Module 1 - First Module
Line 3
Module 2 - Second Module`
      
      const headers = extractModuleHeaders(text)
      
      expect(headers).toHaveLength(2)
      expect(headers[0].lineIndex).toBe(2)
      expect(headers[1].lineIndex).toBe(4)
    })
  })
  
  describe('createModuleContext', () => {
    it('should create context from module header', () => {
      const header = {
        moduleNumber: 1,
        moduleName: 'Safety Practice',
        fullHeader: 'Module 1 - Safety Practice',
        lineIndex: 5,
      }
      
      const context = createModuleContext(header)
      
      expect(context.moduleNumber).toBe(1)
      expect(context.moduleName).toBe('Safety Practice')
      expect(context.fullModuleName).toBe('Module 1 - Safety Practice')
    })
    
    it('should create default context for null header', () => {
      const context = createModuleContext(null)
      
      expect(context.moduleNumber).toBeNull()
      expect(context.moduleName).toBeNull()
      expect(context.fullModuleName).toBe('General Content')
    })
  })
  
  describe('moduleContextToId', () => {
    it('should convert module context to ID slug', () => {
      const context = {
        moduleNumber: 1,
        moduleName: 'Safety Practice and Hand Tools',
        fullModuleName: 'Module 1 - Safety Practice and Hand Tools',
      }
      
      const id = moduleContextToId(context)
      
      expect(id).toBe('module-1-safety-practice-and-hand-tools')
    })
    
    it('should handle special characters in module name', () => {
      const context = {
        moduleNumber: 2,
        moduleName: 'AC/DC Theory & Applications',
        fullModuleName: 'Module 2: AC/DC Theory & Applications',
      }
      
      const id = moduleContextToId(context)
      
      expect(id).toBe('module-2-ac-dc-theory-applications')
    })
    
    it('should return general-content for null module number', () => {
      const context = {
        moduleNumber: null,
        moduleName: null,
        fullModuleName: 'General Content',
      }
      
      const id = moduleContextToId(context)
      
      expect(id).toBe('general-content')
    })
  })
  
  describe('getDefaultModuleContext', () => {
    it('should return default module context', () => {
      const context = getDefaultModuleContext()
      
      expect(context.moduleNumber).toBeNull()
      expect(context.moduleName).toBeNull()
      expect(context.fullModuleName).toBe('General Content')
    })
  })
})
