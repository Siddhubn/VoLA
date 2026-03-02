/**
 * Trade Type Detection
 * 
 * Detects whether a PDF file contains Trade Theory (TT) or Trade Practical (TP)
 * content based on filename patterns.
 */

export type TradeType = 'trade_theory' | 'trade_practical'

/**
 * Detect trade type from filename
 * 
 * Patterns:
 * - Filename contains "TT" or "Trade Theory" → trade_theory
 * - Filename contains "TP" or "Trade Practical" → trade_practical
 * - Default: trade_theory
 */
export function detectTradeTypeFromFilename(filename: string): TradeType {
  const normalizedFilename = filename.toLowerCase()
  
  // Check for Trade Practical patterns
  if (normalizedFilename.includes('tp') || 
      normalizedFilename.includes('trade practical') ||
      normalizedFilename.includes('tradepractical') ||
      normalizedFilename.includes('trade_practical')) {
    return 'trade_practical'
  }
  
  // Check for Trade Theory patterns
  if (normalizedFilename.includes('tt') || 
      normalizedFilename.includes('trade theory') ||
      normalizedFilename.includes('tradetheory') ||
      normalizedFilename.includes('trade_theory')) {
    return 'trade_theory'
  }
  
  // Default to trade_theory
  return 'trade_theory'
}

/**
 * Convert trade type to display string
 */
export function tradeTypeToDisplayString(tradeType: TradeType): string {
  return tradeType === 'trade_theory' ? 'Trade Theory' : 'Trade Practical'
}

/**
 * Convert trade type to short code
 */
export function tradeTypeToShortCode(tradeType: TradeType): string {
  return tradeType === 'trade_theory' ? 'TT' : 'TP'
}
