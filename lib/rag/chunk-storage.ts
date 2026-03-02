/**
 * Chunk Storage with Validation
 * 
 * Ensures all required fields are present before storing chunks
 */

import { TradeType } from './trade-type-detector'

export interface StorageChunk {
  content: string
  course: 'fitter' | 'electrician'
  trade_type: TradeType
  module: string
  module_name: string
  section: string | null
  page_number: number | null
  chunk_index: number
}

export interface ChunkValidationError {
  field: string
  message: string
}

/**
 * Validate that a chunk has all required fields
 */
export function validateChunk(chunk: Partial<StorageChunk>): ChunkValidationError[] {
  const errors: ChunkValidationError[] = []
  
  if (!chunk.content || chunk.content.trim().length === 0) {
    errors.push({
      field: 'content',
      message: 'Content is required and cannot be empty'
    })
  }
  
  if (!chunk.course) {
    errors.push({
      field: 'course',
      message: 'Course is required'
    })
  } else if (chunk.course !== 'fitter' && chunk.course !== 'electrician') {
    errors.push({
      field: 'course',
      message: 'Course must be either "fitter" or "electrician"'
    })
  }
  
  if (!chunk.trade_type) {
    errors.push({
      field: 'trade_type',
      message: 'Trade type is required'
    })
  } else if (chunk.trade_type !== 'trade_theory' && chunk.trade_type !== 'trade_practical') {
    errors.push({
      field: 'trade_type',
      message: 'Trade type must be either "trade_theory" or "trade_practical"'
    })
  }
  
  if (!chunk.module) {
    errors.push({
      field: 'module',
      message: 'Module is required'
    })
  }
  
  if (!chunk.module_name) {
    errors.push({
      field: 'module_name',
      message: 'Module name is required'
    })
  }
  
  if (chunk.chunk_index === undefined || chunk.chunk_index === null) {
    errors.push({
      field: 'chunk_index',
      message: 'Chunk index is required'
    })
  } else if (chunk.chunk_index < 0) {
    errors.push({
      field: 'chunk_index',
      message: 'Chunk index must be non-negative'
    })
  }
  
  return errors
}

/**
 * Check if a chunk is valid for storage
 */
export function isValidChunk(chunk: Partial<StorageChunk>): chunk is StorageChunk {
  return validateChunk(chunk).length === 0
}

/**
 * Prepare a chunk for storage with validation
 * Throws an error if validation fails
 */
export function prepareChunkForStorage(chunk: Partial<StorageChunk>): StorageChunk {
  const errors = validateChunk(chunk)
  
  if (errors.length > 0) {
    const errorMessages = errors.map(e => `${e.field}: ${e.message}`).join(', ')
    throw new Error(`Chunk validation failed: ${errorMessages}`)
  }
  
  return chunk as StorageChunk
}

/**
 * Create a storage chunk with all required fields
 */
export function createStorageChunk(params: {
  content: string
  course: 'fitter' | 'electrician'
  trade_type: TradeType
  module: string
  module_name: string
  section?: string | null
  page_number?: number | null
  chunk_index: number
}): StorageChunk {
  return {
    content: params.content,
    course: params.course,
    trade_type: params.trade_type,
    module: params.module,
    module_name: params.module_name,
    section: params.section ?? null,
    page_number: params.page_number ?? null,
    chunk_index: params.chunk_index
  }
}
