'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Database, FileText, MessageSquare, BarChart3, HardDrive } from 'lucide-react'

interface SystemStats {
  total_pdfs: number
  total_chunks: number
  total_embeddings: number
  pdfs_by_status: Record<string, number>
  pdfs_by_course: Record<string, number>
  chunks_by_course: Record<string, number>
  chunks_by_module: Array<{ course: string; module: string; count: number }>
}

interface ProcessingStats {
  course: string
  status: string
  count: number
  avg_chunks: number | null
  avg_processing_time_seconds: number | null
}

interface DatabaseStats {
  database_size: string
  largest_tables: Array<{ table_name: string; size: string }>
}

interface ModuleStats {
  course: string
  module_id: string
  module_name: string
  chunk_count: number
  avg_token_count: number | null
  page_range: string | null
}

interface ChatStats {
  total_messages: number
  unique_sessions: number
  avg_messages_per_session: number
  messages_by_course: Record<string, number>
}

export default function RAGAdminDashboard() {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [processingStats, setProcessingStats] = useState<ProcessingStats[]>([])
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null)
  const [moduleStats, setModuleStats] = useState<ModuleStats[]>([])
  const [chatStats, setChatStats] = useState<ChatStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<'all' | 'fitter' | 'electrician'>('all')

  useEffect(() => {
    loadAllStats()
  }, [])

  useEffect(() => {
    if (selectedCourse !== 'all') {
      loadModuleStats(selectedCourse)
    } else {
      loadModuleStats()
    }
  }, [selectedCourse])

  const loadAllStats = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [system, processing, database, modules, chat] = await Promise.all([
        fetch('/api/rag/stats?type=system').then(r => r.json()),
        fetch('/api/rag/stats?type=processing').then(r => r.json()),
        fetch('/api/rag/stats?type=database').then(r => r.json()),
        fetch('/api/rag/stats?type=modules').then(r => r.json()),
        fetch('/api/rag/stats?type=chat').then(r => r.json())
      ])

      if (system.success) setSystemStats(system.stats)
      if (processing.success) setProcessingStats(processing.stats)
      if (database.success) setDatabaseStats(database.stats)
      if (modules.success) setModuleStats(modules.stats)
      if (chat.success) setChatStats(chat.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const loadModuleStats = async (course?: 'fitter' | 'electrician') => {
    try {
      const url = course 
        ? `/api/rag/stats?type=modules&course=${course}`
        : '/api/rag/stats?type=modules'
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setModuleStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to load module stats:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RAG System Dashboard</h1>
          <p className="text-muted-foreground">Monitor and analyze your knowledge base</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="chat">Chat Analytics</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total PDFs</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats?.total_pdfs || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Processed documents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Chunks</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats?.total_chunks || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Content segments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Embeddings</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats?.total_embeddings || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Vector embeddings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{chatStats?.unique_sessions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {chatStats?.total_messages || 0} total messages
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>PDFs by Status</CardTitle>
                <CardDescription>Processing status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {systemStats?.pdfs_by_status && Object.entries(systemStats.pdfs_by_status).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={status === 'completed' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}>
                          {status}
                        </Badge>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content by Course</CardTitle>
                <CardDescription>Chunks distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {systemStats?.chunks_by_course && Object.entries(systemStats.chunks_by_course).map(([course, count]) => (
                    <div key={course} className="flex items-center justify-between">
                      <span className="capitalize font-medium">{course}</span>
                      <span className="font-semibold">{count} chunks</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PDF Processing Statistics</CardTitle>
              <CardDescription>Performance metrics for document processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {processingStats.map((stat, idx) => (
                  <div key={idx} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold capitalize">{stat.course}</span>
                        <Badge variant={stat.status === 'completed' ? 'default' : 'secondary'}>
                          {stat.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{stat.count} PDFs</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Avg Chunks:</span>
                        <span className="ml-2 font-medium">
                          {stat.avg_chunks ? Math.round(stat.avg_chunks) : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Time:</span>
                        <span className="ml-2 font-medium">
                          {stat.avg_processing_time_seconds 
                            ? `${Math.round(stat.avg_processing_time_seconds)}s` 
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Module Distribution</CardTitle>
              <CardDescription>Content breakdown by module</CardDescription>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setSelectedCourse('all')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    selectedCourse === 'all' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary'
                  }`}
                >
                  All Courses
                </button>
                <button
                  onClick={() => setSelectedCourse('fitter')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    selectedCourse === 'fitter' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary'
                  }`}
                >
                  Fitter
                </button>
                <button
                  onClick={() => setSelectedCourse('electrician')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    selectedCourse === 'electrician' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary'
                  }`}
                >
                  Electrician
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {moduleStats.map((module, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{module.module_name}</h4>
                        <p className="text-xs text-muted-foreground capitalize">{module.course}</p>
                      </div>
                      <Badge>{module.chunk_count} chunks</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {module.avg_token_count && (
                        <div>
                          <span className="text-muted-foreground">Avg Tokens:</span>
                          <span className="ml-2">{Math.round(module.avg_token_count)}</span>
                        </div>
                      )}
                      {module.page_range && (
                        <div>
                          <span className="text-muted-foreground">Pages:</span>
                          <span className="ml-2">{module.page_range}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{chatStats?.total_messages || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Unique Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{chatStats?.unique_sessions || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avg Messages/Session</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {chatStats?.avg_messages_per_session 
                    ? chatStats.avg_messages_per_session.toFixed(1) 
                    : '0'}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Messages by Course</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {chatStats?.messages_by_course && Object.entries(chatStats.messages_by_course).map(([course, count]) => (
                  <div key={course} className="flex items-center justify-between">
                    <span className="capitalize font-medium">{course}</span>
                    <span className="font-semibold">{count} messages</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Statistics</CardTitle>
              <CardDescription>Storage and table information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Database Size</p>
                    <p className="text-2xl font-bold">{databaseStats?.database_size || 'Unknown'}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Table Sizes</h4>
                  <div className="space-y-2">
                    {databaseStats?.largest_tables.map((table, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="font-mono text-sm">{table.table_name}</span>
                        <Badge variant="outline">{table.size}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
