import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  name: string
  email: string
  password: string
  role: 'student' | 'instructor' | 'admin'
  avatar?: string
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
  isActive: boolean
  profile: {
    bio?: string
    skills: string[]
    learningGoals: string[]
    completedCourses: number
    totalStudyTime: number
  }
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    default: 'student'
  },
  avatar: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profile: {
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot be more than 500 characters']
    },
    skills: [{
      type: String,
      trim: true
    }],
    learningGoals: [{
      type: String,
      trim: true
    }],
    completedCourses: {
      type: Number,
      default: 0
    },
    totalStudyTime: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
})

// Index for better query performance
UserSchema.index({ email: 1 })
UserSchema.index({ role: 1 })
UserSchema.index({ isActive: 1 })

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)