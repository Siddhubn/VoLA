import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '../route'
import { NextRequest } from 'next/server'

// Mock the dependencies
vi.mock('@/lib/rag/quality-validator', () => ({
  qualityValidator: {
    validateChunk: vi.fn(),
    batchValidateAndStore: vi.fn(),
    storeQualityMetrics: vi.fn()
  }
}))

vi.mock('@/lib/postgresql', () => ({
  query: vi.fn()
}))

describe('Quality Validation API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/rag/quality/validate', () => {
    it('should validate all chunks when no chunkIds provided', async () => {
      const { qualityValidator } = await import('@/lib/rag/quality-validator')
      
      vi.mocked(qualityValidator.batchValidateAndStore).mockResolvedValue({
        total: 100,
        excellent: 20,
        good: 40,
        fair: 25,
        poor: 10,
        needsReview: 5
      })

      const request = new NextRequest('http://localhost/api/rag/quality/validate', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.stats).toBeDefined()
      expect(data.stats.total).toBe(100)
    })

    it('should validate specific chunks when chunkIds provided', async () => {
      const { qualityValidator } = await import('@/lib/rag/quality-validator')
      const { query } = await import('@/lib/postgresql')

      vi.mocked(query).mockResolvedValue({
        rows: [{ id: 1, content: 'Test content' }]
      } as any)

      vi.mocked(qualityValidator.validateChunk).mockResolvedValue({
        chunkId: 1,
        metrics: {} as any,
        flags: {} as any,
        qualityScore: 0.8,
        status: 'good',
        recommendations: []
      })

      const request = new NextRequest('http://localhost/api/rag/quality/validate', {
        method: 'POST',
        body: JSON.stringify({
          chunkIds: [1],
          storeResults: false
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.results).toHaveLength(1)
    })

    it('should handle validation errors', async () => {
      const { qualityValidator } = await import('@/lib/rag/quality-validator')
      
      vi.mocked(qualityValidator.batchValidateAndStore).mockRejectedValue(
        new Error('Validation failed')
      )

      const request = new NextRequest('http://localhost/api/rag/quality/validate', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation failed')
    })
  })

  describe('GET /api/rag/quality/validate', () => {
    it('should fetch chunks with quality data', async () => {
      const { query } = await import('@/lib/postgresql')

      vi.mocked(query).mockResolvedValue({
        rows: [
          {
            id: 1,
            course: 'fitter',
            pdf_source: 'test.pdf',
            module: 'safety',
            section: 'intro',
            page_number: 1,
            content: 'Test content',
            content_preview: 'Test...',
            metadata: {
              quality: {
                score: 0.8,
                status: 'good'
              }
            }
          }
        ]
      } as any)

      const request = new NextRequest('http://localhost/api/rag/quality/validate?course=fitter')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.chunks).toHaveLength(1)
      expect(data.chunks[0].course).toBe('fitter')
    })

    it('should filter by status', async () => {
      const { query } = await import('@/lib/postgresql')

      vi.mocked(query).mockResolvedValue({
        rows: []
      } as any)

      const request = new NextRequest('http://localhost/api/rag/quality/validate?status=needs_review')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.chunks).toHaveLength(0)
    })
  })
})
