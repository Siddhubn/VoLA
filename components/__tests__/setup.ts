import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

// Mock scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})
