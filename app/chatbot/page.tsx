'use client'

import { useState } from 'react'
import { AIChatbot } from '@/components/AIChatbot'

export default function ChatbotPage() {
  const [course, setCourse] = useState<'fitter' | 'electrician'>('fitter')

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Course Assistant
        </h1>
        <p className="text-gray-600">
          Get instant answers to your questions about ITI course content with source citations
        </p>
      </div>

      <AIChatbot 
        course={course} 
        onCourseChange={setCourse}
      />
    </div>
  )
}
