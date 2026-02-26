// Simple in-memory auth for testing (fallback when MongoDB is not available)
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'

// In-memory user storage (for testing only)
const users: Array<{
  id: string
  name: string
  email: string
  password: string
  role: string
  createdAt: Date
  profile: {
    skills: string[]
    learningGoals: string[]
    completedCourses: number
    totalStudyTime: number
  }
}> = []

export interface TokenPayload {
  userId: string
  email: string
  role: string
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch (error) {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}

export async function removeAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')
  return token?.value || null
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = await getAuthToken()
  if (!token) return null
  return verifyToken(token)
}

// Simple user operations
export async function createUser(userData: {
  name: string
  email: string
  password: string
  role: string
}) {
  // Check if user exists
  const existingUser = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase())
  if (existingUser) {
    throw new Error('User with this email already exists')
  }

  // Hash password
  const hashedPassword = await hashPassword(userData.password)

  // Create user
  const user = {
    id: Date.now().toString(),
    name: userData.name.trim(),
    email: userData.email.toLowerCase(),
    password: hashedPassword,
    role: userData.role,
    createdAt: new Date(),
    profile: {
      skills: [],
      learningGoals: [],
      completedCourses: 0,
      totalStudyTime: 0
    }
  }

  users.push(user)
  return user
}

export async function findUserByEmail(email: string) {
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
}

export async function findUserById(id: string) {
  return users.find(u => u.id === id) || null
}