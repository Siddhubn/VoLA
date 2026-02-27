'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Search, BookOpen, FileText, ChevronRight, ChevronDown, Loader2 } from 'lucide-react'

interface ModuleInfo {
  id: string
  name: string
  topics: string[]
  chunkCount: number
  pageRange: string
  description?: string
}

interface TopicInfo {
  section: string
  chunkCount: number
  pageNumbers: number[]
  contentExcerpts: string[]
}

interface ModuleDetail {
  id: string
  name: string
  description?: string
  topics: TopicInfo[]
  totalChunks: number
  pageRange: string
}

interface SyllabusExplorerProps {
  course: 'fitter' | 'electrician'
}

export function SyllabusExplorer({ course }: SyllabusExplorerProps) {
  const [modules, setModules] = useState<ModuleInfo[]>([])
  const [selectedModule, setSelectedModule] = useState<ModuleDetail | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingModule, setLoadingModule] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch modules list
  useEffect(() => {
    async function fetchModules() {
      setLoading(true)
      setError(null)
      try {
        const url = searchQuery 
          ? `/api/rag/syllabus/${course}?search=${encodeURIComponent(searchQuery)}`
          : `/api/rag/syllabus/${course}`
        
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Failed to fetch syllabus')
        }
        
        const data = await response.json()
        if (data.success) {
          setModules(data.modules)
        } else {
          throw new Error(data.error || 'Failed to load syllabus')
        }
      } catch (err) {
        console.error('Error fetching modules:', err)
        setError(err instanceof Error ? err.message : 'Failed to load syllabus')
      } finally {
        setLoading(false)
      }
    }

    fetchModules()
  }, [course, searchQuery])

  // Fetch module details
  async function fetchModuleDetails(moduleId: string) {
    setLoadingModule(moduleId)
    try {
      const response = await fetch(`/api/rag/syllabus/${course}/${moduleId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch module details')
      }
      
      const data = await response.json()
      if (data.success) {
        setSelectedModule(data.module)
        setExpandedModules(prev => new Set(prev).add(moduleId))
      }
    } catch (err) {
      console.error('Error fetching module details:', err)
    } finally {
      setLoadingModule(null)
    }
  }

  function toggleModule(moduleId: string) {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
      if (selectedModule?.id === moduleId) {
        setSelectedModule(null)
      }
    } else {
      fetchModuleDetails(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchQuery(searchInput)
    setExpandedModules(new Set())
    setSelectedModule(null)
  }

  function clearSearch() {
    setSearchInput('')
    setSearchQuery('')
    setExpandedModules(new Set())
    setSelectedModule(null)
  }

  const courseTitle = course === 'electrician' ? 'Electrician' : 'Fitter'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {courseTitle} Course Syllabus
        </h1>
        <p className="text-gray-600">
          Explore course modules, topics, and content from the ITI curriculum
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search syllabus by keyword or topic..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            {searchQuery && (
              <Button type="button" variant="outline" onClick={clearSearch}>
                Clear
              </Button>
            )}
          </form>
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              Showing results for: <span className="font-medium">{searchQuery}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading syllabus...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modules List */}
      {!loading && !error && modules.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600">
              {searchQuery 
                ? 'No modules found matching your search'
                : 'No modules available for this course'}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && modules.length > 0 && (
        <div className="space-y-4">
          {modules.map((module) => {
            const isExpanded = expandedModules.has(module.id)
            const isLoading = loadingModule === module.id
            const moduleDetails = selectedModule?.id === module.id ? selectedModule : null

            return (
              <Card key={module.id}>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleModule(module.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                        <CardTitle className="text-xl">{module.name}</CardTitle>
                      </div>
                      {module.description && (
                        <CardDescription className="mt-2 ml-7">
                          {module.description}
                        </CardDescription>
                      )}
                      <div className="flex items-center space-x-4 mt-2 ml-7 text-sm text-gray-500">
                        <span className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          {module.chunkCount} sections
                        </span>
                        <span className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-1" />
                          Pages {module.pageRange}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t">
                    {isLoading && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-600">Loading topics...</span>
                      </div>
                    )}

                    {!isLoading && moduleDetails && (
                      <div className="space-y-4 pt-4">
                        {moduleDetails.topics.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">
                            No topics found in this module
                          </p>
                        ) : (
                          moduleDetails.topics.map((topic, index) => (
                            <div 
                              key={index}
                              className="p-4 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">
                                  {topic.section}
                                </h4>
                                <div className="text-sm text-gray-500">
                                  {topic.pageNumbers.length > 0 && (
                                    <span>
                                      Pages: {topic.pageNumbers.join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {topic.contentExcerpts.length > 0 && (
                                <div className="space-y-2 mt-3">
                                  {topic.contentExcerpts.map((excerpt, excerptIndex) => (
                                    <div 
                                      key={excerptIndex}
                                      className="p-3 bg-white rounded border border-gray-200"
                                    >
                                      <p className="text-sm text-gray-700 leading-relaxed">
                                        {excerpt}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
