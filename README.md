# VoLA - Voice of Learning Assistant (Stage 1)

A modern web application built with Next.js 14, featuring user authentication and a comprehensive dashboard for learning management, powered by PostgreSQL.

## 🚀 Features

### Authentication System
- **User Registration**: Secure account creation with email validation
- **User Login**: JWT-based authentication with secure cookies
- **Password Security**: bcrypt hashing with salt rounds
- **Role-based Access**: Support for students, instructors, and admins
- **Route Protection**: Middleware-based authentication guards
- **Session Management**: Automatic token refresh and logout

### Dashboard
- **Personalized Welcome**: Dynamic user greeting and stats
- **Learning Analytics**: Progress tracking and study time metrics
- **Activity Feed**: Recent achievements and learning milestones
- **Goal Tracking**: Visual progress bars for learning objectives
- **Achievement System**: Badges and rank progression
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### User Experience
- **Modern UI**: Clean, professional interface with consistent design
- **Interactive Components**: Hover effects and smooth transitions
- **Form Validation**: Real-time validation with helpful error messages
- **Loading States**: Visual feedback during async operations
- **Accessibility**: WCAG compliant components and keyboard navigation

## 🛠 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with native pg driver
- **Authentication**: JWT with secure HTTP-only cookies
- **Styling**: Tailwind CSS with custom components
- **UI Components**: Custom component library with Radix UI patterns
- **Forms**: React Hook Form with validation
- **Icons**: Lucide React
- **Password Hashing**: bcryptjs

## 📁 Project Structure

```
├── app/
│   ├── api/auth/          # Authentication API routes
│   ├── auth/              # Login/Register pages
│   ├── dashboard/         # Main dashboard
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # Reusable UI components
│   └── Navigation.tsx     # Main navigation component
├── lib/
│   ├── models/            # PostgreSQL models
│   ├── auth.ts            # Authentication utilities
│   ├── postgresql.ts      # Database connection
│   └── utils.ts           # Helper functions
├── scripts/
│   ├── check-setup.js     # Setup verification
│   └── init-db.js         # Database initialization
├── middleware.ts          # Route protection middleware
└── package.json
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+ (local or cloud)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "User Authentication and Dashboard"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL**
   
   **Option A: Local PostgreSQL**
   ```bash
   # Install PostgreSQL (if not already installed)
   # On macOS with Homebrew:
   brew install postgresql
   brew services start postgresql
   
   # On Ubuntu/Debian:
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   
   # On Windows: Download from https://www.postgresql.org/download/
   ```
   
   **Create Database:**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE vola_db;
   
   # Create user (optional)
   CREATE USER vola_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE vola_db TO vola_user;
   
   # Exit
   \q
   ```

4. **Set up environment variables**
   
   Update `.env.local` with your PostgreSQL credentials:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/vola_db
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-nextauth-secret-key
   ```

5. **Initialize the database**
   ```bash
   npm run init-db
   ```

6. **Verify setup**
   ```bash
   npm run check-setup
   ```

7. **Run the development server**
   ```bash
   npm run dev
   ```

8. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  avatar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  learning_goals TEXT[] DEFAULT '{}',
  completed_courses INTEGER DEFAULT 0,
  total_study_time INTEGER DEFAULT 0
);
```

### Indexes
- `idx_users_email` - Fast email lookups
- `idx_users_role` - Role-based queries
- `idx_users_is_active` - Active user filtering
- `idx_users_created_at` - Chronological sorting

## 🔐 Authentication Flow

### Registration
1. User fills registration form with name, email, password, and role
2. Client-side validation ensures data integrity
3. Server validates input and checks for existing users
4. Password is hashed using bcrypt with 12 salt rounds
5. User record is created in PostgreSQL
6. JWT token is generated and set as HTTP-only cookie
7. User is redirected to dashboard

### Login
1. User enters email and password
2. Server finds user by email and verifies password
3. JWT token is generated with user payload
4. Token is set as secure HTTP-only cookie
5. User's last login timestamp is updated
6. User is redirected to dashboard or intended route

### Route Protection
- Middleware checks for valid JWT token on protected routes
- Unauthenticated users are redirected to login page
- Authenticated users accessing auth pages are redirected to dashboard
- Token expiration is handled gracefully with automatic logout

## 📊 Dashboard Features

### Statistics Cards
- **Total Courses**: Number of enrolled courses
- **Completed Courses**: Successfully finished courses
- **Study Time**: Total learning hours tracked
- **Current Streak**: Consecutive days of learning activity

### Recent Activity Feed
- Course completions with scores
- New skill unlocks and achievements
- Study session summaries
- Timestamped activity log

### Learning Goals
- Visual progress tracking with percentage completion
- Due date reminders
- Goal categorization and prioritization
- Achievement milestones

### User Profile Integration
- Avatar display with fallback initials
- Role-based UI elements
- Account creation and last login timestamps
- Personalized recommendations

## 🔒 Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Security**: HTTP-only cookies with secure flags
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Prevention**: Parameterized queries with pg driver
- **XSS Protection**: React's built-in XSS prevention
- **CSRF Protection**: SameSite cookie attributes
- **Route Protection**: Middleware-based authentication guards

## 🚀 Deployment

### Environment Setup
1. Set production environment variables
2. Configure PostgreSQL connection (local or cloud)
3. Update JWT secrets with strong random values
4. Set secure cookie flags for HTTPS

### Database Migration
```bash
# Production database setup
npm run init-db
```

### Build and Deploy
```bash
npm run build
npm start
```

### Recommended Platforms
- **Vercel**: Seamless Next.js deployment with Vercel Postgres
- **Railway**: Full-stack deployment with PostgreSQL addon
- **Render**: Web service with PostgreSQL database
- **DigitalOcean**: App Platform with managed PostgreSQL

### Cloud Database Options
- **Vercel Postgres**: Integrated with Vercel deployments
- **Railway PostgreSQL**: Managed PostgreSQL with Railway
- **Supabase**: PostgreSQL with additional features
- **AWS RDS**: Managed PostgreSQL on AWS
- **Google Cloud SQL**: PostgreSQL on Google Cloud

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration with valid/invalid data
- [ ] User login with correct/incorrect credentials
- [ ] Dashboard loads with user-specific data
- [ ] Navigation between protected routes
- [ ] Logout functionality
- [ ] Route protection for unauthenticated users
- [ ] Responsive design on mobile devices
- [ ] Form validation and error handling
- [ ] PostgreSQL connection and queries

### API Testing
```bash
# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test123!","role":"student"}'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### Database Testing
```bash
# Check database connection
npm run init-db

# Verify tables exist
psql -d vola_db -c "\dt"

# Check user data
psql -d vola_db -c "SELECT id, name, email, role FROM users;"
```

## 📈 Future Enhancements (Stage 2+)

- **Course Management**: Create and manage learning courses
- **Progress Tracking**: Detailed analytics and reporting
- **Social Features**: User interactions and community
- **Mobile App**: React Native companion app
- **Real-time Features**: WebSocket integration for live updates
- **Advanced Analytics**: Learning pattern analysis
- **Integration APIs**: Third-party learning platform connections
- **Multi-tenancy**: Support for multiple organizations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

---

**VoLA Stage 1** - Now powered by PostgreSQL for robust, scalable data management! 🐘🎓