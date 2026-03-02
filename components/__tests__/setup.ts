import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

// Mock scrollIntoView (only in browser/jsdom environment)
beforeAll(() => {
  if (typeof Element !== 'undefined') {
    Element.prototype.scrollIntoView = () => {}
  }
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})
