import { describe, it, expect } from 'vitest'
import {
  detectTradeTypeFromFilename,
  tradeTypeToDisplayString,
  tradeTypeToShortCode,
} from '../trade-type-detector'

describe('Trade Type Detector', () => {
  describe('detectTradeTypeFromFilename', () => {
    it('should detect TP from filename with "TP"', () => {
      expect(detectTradeTypeFromFilename('electrician-TP.pdf')).toBe('trade_practical')
      expect(detectTradeTypeFromFilename('fitter_TP_module1.pdf')).toBe('trade_practical')
      expect(detectTradeTypeFromFilename('TP-electrician.pdf')).toBe('trade_practical')
    })
    
    it('should detect TP from filename with "Trade Practical"', () => {
      expect(detectTradeTypeFromFilename('electrician-Trade Practical.pdf')).toBe('trade_practical')
      expect(detectTradeTypeFromFilename('Trade Practical - Fitter.pdf')).toBe('trade_practical')
    })
    
    it('should detect TP from filename with variations', () => {
      expect(detectTradeTypeFromFilename('electrician-TradePractical.pdf')).toBe('trade_practical')
      expect(detectTradeTypeFromFilename('fitter_trade_practical.pdf')).toBe('trade_practical')
    })
    
    it('should detect TT from filename with "TT"', () => {
      expect(detectTradeTypeFromFilename('electrician-TT.pdf')).toBe('trade_theory')
      expect(detectTradeTypeFromFilename('fitter_TT_module1.pdf')).toBe('trade_theory')
      expect(detectTradeTypeFromFilename('TT-electrician.pdf')).toBe('trade_theory')
    })
    
    it('should detect TT from filename with "Trade Theory"', () => {
      expect(detectTradeTypeFromFilename('electrician-Trade Theory.pdf')).toBe('trade_theory')
      expect(detectTradeTypeFromFilename('Trade Theory - Fitter.pdf')).toBe('trade_theory')
    })
    
    it('should detect TT from filename with variations', () => {
      expect(detectTradeTypeFromFilename('electrician-TradeTheory.pdf')).toBe('trade_theory')
      expect(detectTradeTypeFromFilename('fitter_trade_theory.pdf')).toBe('trade_theory')
    })
    
    it('should be case insensitive', () => {
      expect(detectTradeTypeFromFilename('ELECTRICIAN-TP.PDF')).toBe('trade_practical')
      expect(detectTradeTypeFromFilename('FITTER-TT.PDF')).toBe('trade_theory')
      expect(detectTradeTypeFromFilename('Electrician-Tp.pdf')).toBe('trade_practical')
      expect(detectTradeTypeFromFilename('Fitter-Tt.pdf')).toBe('trade_theory')
    })
    
    it('should default to trade_theory when no pattern matches', () => {
      expect(detectTradeTypeFromFilename('electrician.pdf')).toBe('trade_theory')
      expect(detectTradeTypeFromFilename('fitter-module1.pdf')).toBe('trade_theory')
      expect(detectTradeTypeFromFilename('syllabus.pdf')).toBe('trade_theory')
    })
    
    it('should handle filenames with paths', () => {
      expect(detectTradeTypeFromFilename('/path/to/electrician-TP.pdf')).toBe('trade_practical')
      expect(detectTradeTypeFromFilename('C:\\pdfs\\fitter-TT.pdf')).toBe('trade_theory')
    })
  })
  
  describe('tradeTypeToDisplayString', () => {
    it('should convert trade_theory to display string', () => {
      expect(tradeTypeToDisplayString('trade_theory')).toBe('Trade Theory')
    })
    
    it('should convert trade_practical to display string', () => {
      expect(tradeTypeToDisplayString('trade_practical')).toBe('Trade Practical')
    })
  })
  
  describe('tradeTypeToShortCode', () => {
    it('should convert trade_theory to short code', () => {
      expect(tradeTypeToShortCode('trade_theory')).toBe('TT')
    })
    
    it('should convert trade_practical to short code', () => {
      expect(tradeTypeToShortCode('trade_practical')).toBe('TP')
    })
  })
})
