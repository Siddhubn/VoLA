import { query } from '@/lib/postgresql'

export interface IUser {
  id: number
  name: string
  email: string
  password: string
  role: 'student' | 'instructor' | 'admin'
  avatar?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
  last_login?: Date
  bio?: string
  skills: string[]
  learning_goals: string[]
  completed_courses: number
  total_study_time: number
}

export interface CreateUserData {
  name: string
  email: string
  password: string
  role?: 'student' | 'instructor' | 'admin'
  avatar?: string
  bio?: string
  skills?: string[]
  learning_goals?: string[]
}

export interface UpdateUserData {
  name?: string
  email?: string
  password?: string
  role?: 'student' | 'instructor' | 'admin'
  avatar?: string
  is_active?: boolean
  last_login?: Date
  bio?: string
  skills?: string[]
  learning_goals?: string[]
  completed_courses?: number
  total_study_time?: number
}

export class User {
  // Create a new user
  static async create(userData: CreateUserData): Promise<IUser> {
    const {
      name,
      email,
      password,
      role = 'student',
      avatar = '',
      bio = '',
      skills = [],
      learning_goals = []
    } = userData

    const result = await query(
      `INSERT INTO users (name, email, password, role, avatar, bio, skills, learning_goals)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, email.toLowerCase(), password, role, avatar, bio, skills, learning_goals]
    )

    return result.rows[0]
  }

  // Find user by email
  static async findByEmail(email: string): Promise<IUser | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    )

    return result.rows[0] || null
  }

  // Find user by ID
  static async findById(id: number): Promise<IUser | null> {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    )

    return result.rows[0] || null
  }

  // Find user by ID without password
  static async findByIdSafe(id: number): Promise<Omit<IUser, 'password'> | null> {
    const result = await query(
      `SELECT id, name, email, role, avatar, is_active, created_at, updated_at, 
              last_login, bio, skills, learning_goals, completed_courses, total_study_time
       FROM users WHERE id = $1`,
      [id]
    )

    return result.rows[0] || null
  }

  // Update user
  static async update(id: number, updateData: UpdateUserData): Promise<IUser | null> {
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    // Build dynamic update query
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case for database columns
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase()
        fields.push(`${dbField} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    })

    if (fields.length === 0) {
      throw new Error('No fields to update')
    }

    values.push(id) // Add ID as the last parameter

    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    )

    return result.rows[0] || null
  }

  // Update last login
  static async updateLastLogin(id: number): Promise<void> {
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    )
  }

  // Delete user (soft delete by setting is_active to false)
  static async softDelete(id: number): Promise<boolean> {
    const result = await query(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING id',
      [id]
    )

    return result.rows.length > 0
  }

  // Hard delete user
  static async delete(id: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    )

    return result.rows.length > 0
  }

  // Get all users (admin function)
  static async findAll(limit = 50, offset = 0): Promise<Omit<IUser, 'password'>[]> {
    const result = await query(
      `SELECT id, name, email, role, avatar, is_active, created_at, updated_at, 
              last_login, bio, skills, learning_goals, completed_courses, total_study_time
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )

    return result.rows
  }

  // Count total users
  static async count(): Promise<number> {
    const result = await query('SELECT COUNT(*) as count FROM users')
    return parseInt(result.rows[0].count)
  }

  // Find users by role
  static async findByRole(role: string): Promise<Omit<IUser, 'password'>[]> {
    const result = await query(
      `SELECT id, name, email, role, avatar, is_active, created_at, updated_at, 
              last_login, bio, skills, learning_goals, completed_courses, total_study_time
       FROM users 
       WHERE role = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [role]
    )

    return result.rows
  }

  // Search users by name or email
  static async search(searchTerm: string): Promise<Omit<IUser, 'password'>[]> {
    const result = await query(
      `SELECT id, name, email, role, avatar, is_active, created_at, updated_at, 
              last_login, bio, skills, learning_goals, completed_courses, total_study_time
       FROM users 
       WHERE (name ILIKE $1 OR email ILIKE $1) AND is_active = true
       ORDER BY created_at DESC
       LIMIT 20`,
      [`%${searchTerm}%`]
    )

    return result.rows
  }

  // Check if email exists
  static async emailExists(email: string, excludeId?: number): Promise<boolean> {
    let queryText = 'SELECT id FROM users WHERE email = $1'
    const params: any[] = [email.toLowerCase()]

    if (excludeId) {
      queryText += ' AND id != $2'
      params.push(excludeId)
    }

    const result = await query(queryText, params)
    return result.rows.length > 0
  }

  // Get user statistics
  static async getStats(): Promise<{
    totalUsers: number
    activeUsers: number
    students: number
    instructors: number
    admins: number
  }> {
    const result = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE role = 'student') as students,
        COUNT(*) FILTER (WHERE role = 'instructor') as instructors,
        COUNT(*) FILTER (WHERE role = 'admin') as admins
      FROM users
    `)

    const row = result.rows[0]
    return {
      totalUsers: parseInt(row.total_users),
      activeUsers: parseInt(row.active_users),
      students: parseInt(row.students),
      instructors: parseInt(row.instructors),
      admins: parseInt(row.admins)
    }
  }

  // Get total user count
  static async getTotalCount(): Promise<number> {
    const result = await query('SELECT COUNT(*) as count FROM users')
    return parseInt(result.rows[0].count)
  }

  // Get active user count
  static async getActiveCount(): Promise<number> {
    const result = await query('SELECT COUNT(*) as count FROM users WHERE is_active = true')
    return parseInt(result.rows[0].count)
  }

  // Get recent users
  static async getRecentUsers(limit = 5): Promise<Omit<IUser, 'password'>[]> {
    const result = await query(
      `SELECT id, name, email, role, avatar, is_active, created_at, updated_at, 
              last_login, bio, skills, learning_goals, completed_courses, total_study_time
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    )

    return result.rows
  }
}