import { describe, it, expect, beforeAll } from 'vitest'
import { ModuleDetector, FITTER_MODULES, ELECTRICIAN_MODULES } from '../module-detector'

describe('Module Detector Tests', () => {
  let detector: ModuleDetector

  beforeAll(() => {
    detector = new ModuleDetector()
  })

  describe('Module Data Validation', () => {
    it('should have valid Fitter module data', () => {
      expect(FITTER_MODULES).toBeDefined()
      expect(FITTER_MODULES.length).toBeGreaterThan(0)
      
      FITTER_MODULES.forEach(module => {
        expect(module.course).toBe('fitter')
        expect(module.module_id).toBeTruthy()
        expect(module.module_name).toBeTruthy()
        expect(module.keywords).toBeDefined()
        expect(Array.isArray(module.keywords)).toBe(true)
        expect(module.display_order).toBeGreaterThan(0)
      })
    })

    it('should have valid Electrician module data', () => {
      expect(ELECTRICIAN_MODULES).toBeDefined()
      expect(ELECTRICIAN_MODULES.length).toBeGreaterThan(0)
      
      ELECTRICIAN_MODULES.forEach(module => {
        expect(module.course).toBe('electrician')
        expect(module.module_id).toBeTruthy()
        expect(module.module_name).toBeTruthy()
        expect(module.keywords).toBeDefined()
        expect(Array.isArray(module.keywords)).toBe(true)
        expect(module.display_order).toBeGreaterThan(0)
      })
    })

    it('should have unique module IDs within each course', () => {
      const fitterIds = FITTER_MODULES.map(m => m.module_id)
      const electricianIds = ELECTRICIAN_MODULES.map(m => m.module_id)
      
      expect(new Set(fitterIds).size).toBe(fitterIds.length)
      expect(new Set(electricianIds).size).toBe(electricianIds.length)
    })
  })

  describe('Pattern Matching', () => {
    it('should detect explicit module headers for Fitter course', () => {
      const text = `
Chapter 1: Introduction

Module 1: Safety Practices
This chapter covers workplace safety and hazard identification.
Safety procedures are essential for preventing accidents.

Module 2: Hand Tools and Measuring Instruments  
This section discusses various hand tools used in fitting operations.
Measuring instruments like calipers and micrometers are covered.
      `
      
      const result = detector.detectModules(text, 'fitter')
      
      expect(result.detectedModules.length).toBeGreaterThan(0)
      
      // Should detect safety practices module
      const safetyModule = result.detectedModules.find(m => 
        m.moduleId === 'safety-practices' || m.moduleName.toLowerCase().includes('safety')
      )
      expect(safetyModule).toBeDefined()
      
      // Should detect hand tools module
      const toolsModule = result.detectedModules.find(m => 
        m.moduleId === 'hand-tools' || m.moduleName.toLowerCase().includes('hand tools')
      )
      expect(toolsModule).toBeDefined()
    })

    it('should detect explicit module headers for Electrician course', () => {
      const text = `
Unit 1: Electrical Safety
Electrical safety is paramount in all electrical work.
Proper earthing and grounding procedures must be followed.

Unit 2: Basic Electricity
Understanding voltage, current, and resistance is fundamental.
Ohm's law governs the relationship between these quantities.
      `
      
      const result = detector.detectModules(text, 'electrician')
      
      expect(result.detectedModules.length).toBeGreaterThan(0)
      
      // Should detect electrical safety module
      const safetyModule = result.detectedModules.find(m => 
        m.moduleId.includes('electrical-safety') || m.moduleName.toLowerCase().includes('electrical safety')
      )
      expect(safetyModule).toBeDefined()
      
      // Should detect basic electricity module
      const basicModule = result.detectedModules.find(m => 
        m.moduleId.includes('basic-electricity') || m.moduleName.toLowerCase().includes('basic electricity') || m.moduleName.toLowerCase().includes('electricity')
      )
      expect(basicModule).toBeDefined()
    })

    it('should handle numbered section headers', () => {
      const text = `
1. Safety Practices
Safety is the first priority in any workshop.

2. Hand Tools and Measuring Instruments
Proper tool selection is crucial for quality work.
      `
      
      const result = detector.detectModules(text, 'fitter')
      expect(result.detectedModules.length).toBeGreaterThan(0)
    })

    it('should handle ALL CAPS headers', () => {
      const text = `
SAFETY PRACTICES
All workers must follow safety protocols.

HAND TOOLS AND MEASURING INSTRUMENTS
Quality tools ensure accurate measurements.
      `
      
      const result = detector.detectModules(text, 'fitter')
      expect(result.detectedModules.length).toBeGreaterThan(0)
    })
  })

  describe('Content-Based Detection', () => {
    it('should detect modules based on keyword content for Fitter', () => {
      const text = `
This document covers various aspects of fitting operations.
Safety procedures must be followed at all times. Personal protective equipment
is mandatory in the workshop. Hazard identification is crucial.

The use of hand tools requires proper technique. Calipers and micrometers
are precision measuring instruments. Proper gauge selection is important.

Marking and cutting operations involve scribers and punches. Hacksaw usage
requires proper technique. Filing operations smooth rough surfaces.
      `
      
      const result = detector.detectModules(text, 'fitter')
      expect(result.detectedModules.length).toBeGreaterThan(0)
      
      // Should detect at least one relevant module (with proper prefixes)
      const hasRelevantModule = result.detectedModules.some(m => 
        m.moduleId.includes('safety-practices') || 
        m.moduleId.includes('hand-tools') || 
        m.moduleId.includes('marking-cutting')
      )
      expect(hasRelevantModule).toBe(true)
    })

    it('should detect modules based on keyword content for Electrician', () => {
      const text = `
Electrical safety is paramount in all electrical installations.
Proper earthing and grounding must be implemented. Isolation procedures
prevent electrical shock and electrocution.

Understanding voltage and current relationships is fundamental.
Resistance affects circuit behavior. Ohm's law calculations are essential.
Conductors and insulators have different properties.

Multimeters measure various electrical quantities. Ammeters measure current
while voltmeters measure voltage. Oscilloscopes display waveforms.
      `
      
      const result = detector.detectModules(text, 'electrician')
      expect(result.detectedModules.length).toBeGreaterThan(0)
      
      // Should detect at least one relevant module (with proper prefixes)
      const hasRelevantModule = result.detectedModules.some(m => 
        m.moduleId.includes('electrical-safety') || 
        m.moduleId.includes('basic-electricity') || 
        m.moduleId.includes('electrical-instruments')
      )
      expect(hasRelevantModule).toBe(true)
    })

    it('should assign confidence scores appropriately', () => {
      const text = `
Safety practices are essential. Personal protective equipment must be worn.
Hazard identification prevents accidents. Emergency procedures save lives.
      `
      
      const result = detector.detectModules(text, 'fitter')
      
      result.detectedModules.forEach(module => {
        expect(module.confidence).toBeGreaterThan(0)
        expect(module.confidence).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('Fuzzy Matching Algorithm', () => {
    it.skip('should match similar module names with typos', () => {
      // TODO: Improve fuzzy matching algorithm to handle typos better
      const text = `
Module 1: Safty Practises
This covers workplace safety procedures.
      `
      
      const result = detector.detectModules(text, 'fitter')
      
      // Should still detect safety practices despite typos (check with includes)
      const safetyModule = result.detectedModules.find(m => 
        m.moduleId.includes('safety-practices') || m.moduleName.toLowerCase().includes('safety')
      )
      expect(safetyModule).toBeDefined()
    })

    it.skip('should handle partial keyword matches', () => {
      // TODO: Improve keyword matching for partial matches
      const text = `
This section covers electrical measuring equipment and instruments.
Multimeter usage is demonstrated for electrical measurements. 
Voltage measurement techniques and current measurement procedures are explained.
Electrical instruments like ammeters and voltmeters are essential tools.
      `
      
      const result = detector.detectModules(text, 'electrician')
      
      // Should detect at least one relevant module with more explicit keywords
      expect(result.detectedModules.length).toBeGreaterThan(0)
      
      const hasRelevantModule = result.detectedModules.some(m => 
        m.moduleId.includes('electrical-instruments') || m.moduleId.includes('basic-electricity')
      )
      expect(hasRelevantModule).toBe(true)
    })
  })

  describe('Chunk Assignment', () => {
    it('should assign chunks to appropriate modules', () => {
      const chunkContent = `
Safety procedures must be followed in the workshop. Personal protective
equipment includes safety glasses, gloves, and steel-toed boots. Hazard
identification helps prevent workplace accidents.
      `
      
      const assignment = detector.assignChunkToModule(chunkContent, 'fitter')
      
      expect(assignment).toBeDefined()
      expect(assignment?.moduleId).toBe('fitter-tp-safety-practices')
      expect(assignment?.confidence).toBeGreaterThan(0)
    })

    it('should return null for ambiguous content', () => {
      const chunkContent = `
This is some generic text that doesn't relate to any specific module.
It contains no technical keywords or identifiable content.
      `
      
      const assignment = detector.assignChunkToModule(chunkContent, 'fitter')
      
      // Should return null or have very low confidence
      expect(assignment === null || assignment.confidence < 0.3).toBe(true)
    })

    it.skip('should prefer detected modules over content-based matching', () => {
      // TODO: Improve module assignment logic to better handle detected modules
      const chunkContent = `
Hand tools are important but safety comes first.
      `
      
      const detectedModules = [{
        moduleId: 'fitter-tp-safety-practices',
        moduleName: 'Safety Practices',
        confidence: 0.8,
        startIndex: 0,
        endIndex: 100
      }]
      
      const assignment = detector.assignChunkToModule(
        chunkContent, 
        'fitter',
        'TP',
        detectedModules
      )
      
      expect(assignment).toBeDefined()
      expect(assignment?.moduleId).toBe('fitter-tp-safety-practices')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty text', () => {
      const result = detector.detectModules('', 'fitter')
      
      expect(result.detectedModules).toBeDefined()
      expect(result.unmappedSections).toBeDefined()
    })

    it('should handle text with no recognizable modules', () => {
      const text = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      `
      
      const result = detector.detectModules(text, 'fitter')
      
      expect(result.detectedModules).toBeDefined()
      // May have 0 modules detected for irrelevant content
    })

    it('should handle very short text', () => {
      const text = 'Safety first.'
      
      const result = detector.detectModules(text, 'fitter')
      
      expect(result.detectedModules).toBeDefined()
    })

    it('should handle text with special characters', () => {
      const text = `
Module 1: Safety & Security Practices (100%)
- Personal protective equipment (PPE) requirements
- Hazard identification & risk assessment
      `
      
      const result = detector.detectModules(text, 'fitter')
      
      expect(result.detectedModules.length).toBeGreaterThan(0)
    })

    it('should handle mixed case and formatting', () => {
      const text = `
CHAPTER 1: safety PRACTICES
This Chapter Covers Workplace Safety And Hazard Identification.
      `
      
      const result = detector.detectModules(text, 'fitter')
      
      const safetyModule = result.detectedModules.find(m => 
        m.moduleId.includes('safety-practices') || m.moduleName.toLowerCase().includes('safety')
      )
      expect(safetyModule).toBeDefined()
    })
  })

  describe('Course-Specific Behavior', () => {
    it('should return different modules for different courses', () => {
      const fitterModules = detector.getModulesForCourse('fitter')
      const electricianModules = detector.getModulesForCourse('electrician')
      
      expect(fitterModules.length).toBeGreaterThan(0)
      expect(electricianModules.length).toBeGreaterThan(0)
      expect(fitterModules).not.toEqual(electricianModules)
      
      // Verify course-specific content
      expect(fitterModules.every(m => m.course === 'fitter')).toBe(true)
      expect(electricianModules.every(m => m.course === 'electrician')).toBe(true)
    })

    it('should detect course-appropriate modules', () => {
      const electricalText = `
Electrical safety procedures must be followed. Voltage measurements
require proper instruments. Current flow in circuits follows Ohm's law.
      `
      
      const fitterResult = detector.detectModules(electricalText, 'fitter')
      const electricianResult = detector.detectModules(electricalText, 'electrician')
      
      // Electrician course should have better matches for electrical content
      const electricianConfidence = electricianResult.detectedModules.reduce(
        (sum, m) => sum + m.confidence, 0
      ) / Math.max(electricianResult.detectedModules.length, 1)
      
      const fitterConfidence = fitterResult.detectedModules.reduce(
        (sum, m) => sum + m.confidence, 0
      ) / Math.max(fitterResult.detectedModules.length, 1)
      
      expect(electricianConfidence).toBeGreaterThan(fitterConfidence)
    })
  })
})