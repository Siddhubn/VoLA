'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface QualityMetrics {
  overall: {
    total_chunks: number
    validated_chunks: number
    avg_quality_score: number
    min_quality_score: number
    max_quality_score: number
    median_quality_score: number
  }
  distribution: Array<{
    status: string
    count: number
    avg_score: number
  }>
  byCourse: Array<{
    course: string
    total_chunks: number
    avg_score: number
    excellent: number
    good: number
    fair: number
    poor: number
    needs_review: number
  }>
  flags: {
    too_short: number
    too_long: number
    high_repetition: number
    low_readability: number
    suspicious_content: number
    needs_review: number
  }
  topIssues: Array<{
    id: number
    course: string
    module: string
    section: string
    page_number: number
    content_preview: string
    quality_score: number
    status: string
    recommendations: string[]
  }>
}

interface ChunkForReview {
  chunkId: number
  course: string
  pdfSource: string
  module: string
  section: string
  pageNumber: number
  content: string
  contentPreview: string
  quality: {
    score: number
    status: string
    metrics: any
    flags: any
    recommendations: string[]
  }
}

export default function QualityDashboard() {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null)
  const [chunksForReview, setChunksForReview] = useState<ChunkForReview[]>([])
  const [selectedCourse, setSelectedCourse] = useState<'all' | 'fitter' | 'electrician'>('all')
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [selectedChunk, setSelectedChunk] = useState<ChunkForReview | null>(null)

  useEffect(() => {
    fetchMetrics()
    fetchChunksForReview()
  }, [selectedCourse])

  const fetchMetrics = async () => {
    try {
      const courseParam = selectedCourse !== 'all' ? `?course=${selectedCourse}` : ''
      const response = await fetch(`/api/rag/quality/metrics${courseParam}`)
      const data = await response.json()
      
      if (data.success) {
        setMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchChunksForReview = async () {
    try {
      const courseParam = selectedCourse !== 'all' ? `?course=${selectedCourse}` : ''
      const response = await fetch(`/api/rag/quality/validate${courseParam}&status=needs_review`)
      const data = await response.json()
      
      if (data.success) {
        setChunksForReview(data.chunks)
      }
    } catch (error) {
      console.error('Error fetching chunks for review:', error)
    }
  }

  const runValidation = async () => {
    setValidating(true)
    try {
      const response = await fetch('/api/rag/quality/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeResults: true })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`Validation complete!\n\nTotal: ${data.stats.total}\nExcellent: ${data.stats.excellent}\nGood: ${data.stats.good}\nFair: ${data.stats.fair}\nPoor: ${data.stats.poor}\nNeeds Review: ${data.stats.needsReview}`)
        fetchMetrics()
        fetchChunksForReview()
      }
    } catch (error) {
      console.error('Error running validation:', error)
      alert('Validation failed. Please try again.')
    } finally {
      setValidating(false)
    }
  }

  const submitReview = async (chunkId: number, status: string, notes: string) => {
    try {
      const response = await fetch('/api/rag/quality/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunkId,
          reviewStatus: status,
          reviewNotes: notes,
          reviewedBy: 'admin'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('Review submitted successfully!')
        fetchChunksForReview()
        setSelectedChunk(null)
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      alert('Review submission failed. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500'
      case 'good': return 'bg-blue-500'
      case 'fair': return 'bg-yellow-500'
      case 'poor': return 'bg-orange-500'
      case 'needs_review': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading quality metrics...</div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">No quality metrics available</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Content Quality Dashboard</h1>
        <div className="flex gap-4">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value as any)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Courses</option>
            <option value="fitter">Fitter</option>
            <option value="electrician">Electrician</option>
          </select>
          <button
            onClick={runValidation}
            disabled={validating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {validating ? 'Validating...' : 'Run Validation'}
          </button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Chunks</div>
          <div className="text-2xl font-bold">{metrics.overall.total_chunks}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Validated</div>
          <div className="text-2xl font-bold">{metrics.overall.validated_chunks}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Avg Score</div>
          <div className="text-2xl font-bold">{(metrics.overall.avg_quality_score * 100).toFixed(1)}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Min Score</div>
          <div className="text-2xl font-bold">{(metrics.overall.min_quality_score * 100).toFixed(1)}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Max Score</div>
          <div className="text-2xl font-bold">{(metrics.overall.max_quality_score * 100).toFixed(1)}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Median Score</div>
          <div className="text-2xl font-bold">{(metrics.overall.median_quality_score * 100).toFixed(1)}%</div>
        </Card>
      </div>

      <Tabs defaultValue="distribution" className="w-full">
        <TabsList>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="flags">Quality Flags</TabsTrigger>
          <TabsTrigger value="issues">Top Issues</TabsTrigger>
          <TabsTrigger value="review">Manual Review</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quality Distribution</h2>
            <div className="space-y-3">
              {metrics.distribution.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      Avg: {(item.avg_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-lg font-semibold">{item.count} chunks</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quality by Course</h2>
            <div className="space-y-4">
              {metrics.byCourse.map((course) => (
                <div key={course.course} className="border-b pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold capitalize">{course.course}</h3>
                    <span className="text-sm text-gray-600">
                      Avg: {(course.avg_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Excellent:</span> {course.excellent}
                    </div>
                    <div>
                      <span className="text-gray-600">Good:</span> {course.good}
                    </div>
                    <div>
                      <span className="text-gray-600">Fair:</span> {course.fair}
                    </div>
                    <div>
                      <span className="text-gray-600">Poor:</span> {course.poor}
                    </div>
                    <div>
                      <span className="text-gray-600">Review:</span> {course.needs_review}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="flags" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quality Flags Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-gray-600">Too Short</div>
                <div className="text-2xl font-bold">{metrics.flags.too_short}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-gray-600">Too Long</div>
                <div className="text-2xl font-bold">{metrics.flags.too_long}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-gray-600">High Repetition</div>
                <div className="text-2xl font-bold">{metrics.flags.high_repetition}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-gray-600">Low Readability</div>
                <div className="text-2xl font-bold">{metrics.flags.low_readability}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-gray-600">Suspicious Content</div>
                <div className="text-2xl font-bold">{metrics.flags.suspicious_content}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-gray-600">Needs Review</div>
                <div className="text-2xl font-bold">{metrics.flags.needs_review}</div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Top 20 Issues (Lowest Quality Scores)</h2>
            <div className="space-y-3">
              {metrics.topIssues.map((issue) => (
                <div key={issue.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Badge className={getStatusColor(issue.status)}>
                        {issue.status}
                      </Badge>
                      <span className="ml-2 text-sm text-gray-600">
                        Score: {(issue.quality_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {issue.course} - {issue.module} - Page {issue.page_number}
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    {issue.content_preview}
                  </div>
                  {issue.recommendations && issue.recommendations.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <strong>Recommendations:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {issue.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Chunks Needing Review ({chunksForReview.length})
            </h2>
            {chunksForReview.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                No chunks need review at this time.
              </div>
            ) : (
              <div className="space-y-3">
                {chunksForReview.slice(0, 10).map((chunk) => (
                  <div key={chunk.chunkId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Badge className={getStatusColor(chunk.quality.status)}>
                          {chunk.quality.status}
                        </Badge>
                        <span className="ml-2 text-sm text-gray-600">
                          Score: {(chunk.quality.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {chunk.course} - {chunk.module} - Page {chunk.pageNumber}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mb-3">
                      {chunk.contentPreview}
                    </div>
                    {chunk.quality.recommendations && chunk.quality.recommendations.length > 0 && (
                      <div className="text-xs text-gray-600 mb-3">
                        <strong>Issues:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {chunk.quality.recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitReview(chunk.chunkId, 'approved', 'Approved after review')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => submitReview(chunk.chunkId, 'needs_edit', 'Needs editing')}
                        className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                      >
                        Needs Edit
                      </button>
                      <button
                        onClick={() => submitReview(chunk.chunkId, 'rejected', 'Rejected - low quality')}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setSelectedChunk(chunk)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        View Full
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal for viewing full chunk */}
      {selectedChunk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Chunk Review</h2>
              <button
                onClick={() => setSelectedChunk(null)}
                className="text-gray-600 hover:text-gray-800 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <strong>Course:</strong> {selectedChunk.course}
              </div>
              <div>
                <strong>Module:</strong> {selectedChunk.module}
              </div>
              <div>
                <strong>Section:</strong> {selectedChunk.section}
              </div>
              <div>
                <strong>Page:</strong> {selectedChunk.pageNumber}
              </div>
              <div>
                <strong>Quality Score:</strong> {(selectedChunk.quality.score * 100).toFixed(1)}%
              </div>
              <div>
                <strong>Content:</strong>
                <div className="mt-2 p-4 bg-gray-50 rounded border whitespace-pre-wrap">
                  {selectedChunk.content}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    submitReview(selectedChunk.chunkId, 'approved', 'Approved after review')
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    submitReview(selectedChunk.chunkId, 'needs_edit', 'Needs editing')
                  }}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  Needs Edit
                </button>
                <button
                  onClick={() => {
                    submitReview(selectedChunk.chunkId, 'rejected', 'Rejected - low quality')
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
