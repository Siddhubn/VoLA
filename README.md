# ITI Quiz & Learning Platform

A modern web application for Industrial Training Institute (ITI) students to practice and learn through AI-powered quizzes. Built with Next.js, TypeScript, and PostgreSQL.

## 🎯 Features

### For Students
- **User Registration & Login** - Secure authentication with JWT tokens
- **Course Selection** - Choose between Fitter and Electrician trades
- **Profile Management** - Update personal information and course selection
- **Interactive Dashboard** - Track progress and access learning materials
- **Quiz System** - AI-powered quizzes for different modules (coming soon)

### For Administrators
- **Admin Dashboard** - Comprehensive system overview
- **User Management** - View, filter, and sort all registered users
- **Advanced Filtering** - Search by name/email, filter by course, sort by multiple criteria
- **Export to CSV** - Download user data for reporting
- **Real-Time Statistics** - Live data from PostgreSQL database
- **Course Distribution** - Visual breakdown of student enrollment

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database running
- npm or yarn package manager

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

3. **Set up environment variables**
Create a `.env.local` file:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/iti_platform
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

4. **Initialize the database**
```bash
node scripts/init-db.js
```

5. **Create an admin account**
```bash
node scripts/create-admin.js
```

6. **Run the development server**
```bash
npm run dev
```

7. **Open your browser**
```
http://localhost:3001
```

## 📁 Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   └── admin/        # Admin endpoints
│   ├── auth/             # Login & registration pages
│   ├── dashboard/        # Student dashboard
│   ├── profile/          # Profile editing page
│   ├── admin/            # Admin dashboard
│   ├── master/           # Admin login page
│   └── debug-auth/       # Debug authentication (dev only)
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components
│   └── Navigation.tsx   # Main navigation
├── lib/
│   ├── models/          # Database models
│   ├── postgresql.ts    # Database connection
│   ├── auth.ts          # Authentication utilities
│   └── simple-auth.ts   # JWT token management
├── scripts/             # Database setup scripts
└── public/              # Static assets
```

## 🔐 Authentication

### Student Access
1. Register at `/auth/register`
2. Select your course (Fitter or Electrician)
3. Login at `/auth/login`
4. Access dashboard at `/dashboard`

### Admin Access
1. Login at `/master`
2. Use admin credentials created during setup
3. Access admin dashboard at `/admin/dashboard`

## 📊 Admin Dashboard Features

### User Management
- **Search** - Find users by name or email
- **Filter** - Show all users, only Fitter, or only Electrician students
- **Sort** - By date (newest first), name (A-Z), or course
- **Export** - Download filtered data as CSV

### Statistics (Real-Time)
- Total registered users
- Active users count
- Quiz statistics (when available)
- Course distribution with percentages
- System health metrics

### Data Integrity
- ✅ All data from PostgreSQL database
- ✅ No mock or simulated data
- ✅ Real-time updates
- ✅ Shows actual zeros when no data exists

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm start            # Start production server

# Database
node scripts/init-db.js        # Initialize database
node scripts/create-admin.js   # Create admin user
node scripts/test-db.js        # Test database connection
node scripts/check-setup.js    # Verify setup
node scripts/debug-db.js       # Debug database issues
```

## 🗄️ Database Schema

### Users Table
```sql
- id (serial, primary key)
- name (varchar)
- email (varchar, unique)
- password (varchar, hashed)
- role (varchar: student/admin)
- course (varchar: fitter/electrician)
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)
- last_login (timestamp)
```

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)

### Database Connection
Edit `lib/postgresql.ts` to customize connection settings.

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/admin-login` - Admin login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `PUT /api/auth/update-profile` - Update profile

### Admin
- `GET /api/admin/stats` - Get system statistics

### Debug (Development Only)
- `GET /api/test-cookie` - Test cookie functionality
- `/debug-auth` - Authentication debug page

## 🎨 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **Styling:** Tailwind CSS
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **Form Handling:** react-hook-form
- **Icons:** lucide-react

## 🚧 Roadmap

- [ ] Quiz generation with AI
- [ ] Progress tracking
- [ ] Leaderboards
- [ ] Certificate generation
- [ ] Mobile app
- [ ] Multi-language support

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for ITI Students**
