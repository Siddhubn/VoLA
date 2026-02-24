# PostgreSQL Setup Guide for VoLA

This guide will help you set up PostgreSQL for the VoLA application.

## 🐘 PostgreSQL Installation

### macOS (using Homebrew)
```bash
# Install PostgreSQL
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Connect to PostgreSQL
psql postgres
```

### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to postgres user and connect
sudo -u postgres psql
```

### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user
4. Add PostgreSQL to your PATH (usually done automatically)

## 🗄️ Database Setup

### 1. Create Database and User
```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE vola_db;

-- Create user (optional, you can use postgres user)
CREATE USER vola_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE vola_db TO vola_user;

-- Exit
\q
```

### 2. Configure Environment Variables
Update your `.env.local` file:

```env
# Using postgres user (default)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/vola_db

# Or using custom user
DATABASE_URL=postgresql://vola_user:your_secure_password@localhost:5432/vola_db

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key
```

## 🔧 VoLA Application Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database
```bash
npm run init-db
```

### 3. Test Database Connection
```bash
npm run test-db
```

### 4. Start Application
```bash
npm run dev
```

## 🚨 Troubleshooting

### Connection Refused (ECONNREFUSED)
**Problem**: Cannot connect to PostgreSQL server.

**Solutions**:
1. **Check if PostgreSQL is running**:
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Ubuntu/Debian
   sudo systemctl status postgresql
   
   # Windows
   # Check Services in Task Manager or Control Panel
   ```

2. **Start PostgreSQL**:
   ```bash
   # macOS
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo systemctl start postgresql
   
   # Windows
   # Start PostgreSQL service from Services panel
   ```

3. **Check if PostgreSQL is listening on port 5432**:
   ```bash
   netstat -an | grep 5432
   # or
   lsof -i :5432
   ```

### Authentication Failed (28P01)
**Problem**: Wrong username or password.

**Solutions**:
1. **Reset postgres user password**:
   ```bash
   # macOS/Linux
   sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'newpassword';"
   
   # Or connect and change password
   sudo -u postgres psql
   ALTER USER postgres PASSWORD 'newpassword';
   \q
   ```

2. **Check your DATABASE_URL format**:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   ```

### Database Does Not Exist (3D000)
**Problem**: The specified database doesn't exist.

**Solutions**:
1. **Create the database**:
   ```bash
   psql -U postgres -c "CREATE DATABASE vola_db;"
   ```

2. **Or use a different database name in your DATABASE_URL**

### Permission Denied
**Problem**: User doesn't have permissions on the database.

**Solutions**:
1. **Grant permissions**:
   ```sql
   psql -U postgres
   GRANT ALL PRIVILEGES ON DATABASE vola_db TO your_username;
   \q
   ```

### Port Already in Use
**Problem**: Another service is using port 5432.

**Solutions**:
1. **Find what's using the port**:
   ```bash
   lsof -i :5432
   ```

2. **Stop the conflicting service or change PostgreSQL port**:
   ```bash
   # Edit postgresql.conf (location varies by OS)
   # Change: port = 5433
   # Then update your DATABASE_URL accordingly
   ```

## 🔍 Useful PostgreSQL Commands

### Basic Commands
```sql
-- List all databases
\l

-- Connect to a database
\c vola_db

-- List all tables
\dt

-- Describe a table
\d users

-- List all users/roles
\du

-- Show current connection info
\conninfo

-- Quit
\q
```

### Database Operations
```sql
-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users';

-- Count records
SELECT COUNT(*) FROM users;

-- View recent users
SELECT id, name, email, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;
```

## 📊 Performance Tips

### 1. Connection Pooling
The application uses connection pooling automatically. Default settings:
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 5 seconds

### 2. Indexes
The following indexes are created automatically:
- `idx_users_email` - For login queries
- `idx_users_role` - For role-based queries
- `idx_users_is_active` - For active user filtering
- `idx_users_created_at` - For chronological sorting

### 3. Monitoring
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries (if logging is enabled)
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## 🔒 Security Best Practices

### 1. User Permissions
- Don't use the `postgres` superuser for applications
- Create dedicated users with minimal required permissions
- Use strong passwords

### 2. Network Security
- For production, restrict connections to specific IPs
- Use SSL/TLS connections
- Consider using connection poolers like PgBouncer

### 3. Environment Variables
- Never commit `.env.local` to version control
- Use different credentials for different environments
- Rotate passwords regularly

## 🚀 Production Deployment

### Cloud PostgreSQL Options
1. **Vercel Postgres** - Integrated with Vercel deployments
2. **Railway PostgreSQL** - Easy setup with Railway
3. **Supabase** - PostgreSQL with additional features
4. **AWS RDS** - Managed PostgreSQL on AWS
5. **Google Cloud SQL** - PostgreSQL on Google Cloud
6. **DigitalOcean Managed Databases** - Simple managed PostgreSQL

### Environment Variables for Production
```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
JWT_SECRET=very-long-random-string-for-production
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=another-long-random-string
```

## 📞 Getting Help

If you're still having issues:

1. **Check the logs**:
   ```bash
   # PostgreSQL logs location varies by OS
   # macOS (Homebrew): /usr/local/var/log/postgresql@14.log
   # Ubuntu: /var/log/postgresql/postgresql-14-main.log
   ```

2. **Run our diagnostic tools**:
   ```bash
   npm run check-setup
   npm run test-db
   ```

3. **Check PostgreSQL status**:
   ```bash
   pg_isready -h localhost -p 5432
   ```

4. **Verify your configuration**:
   - Check `.env.local` file exists and has correct DATABASE_URL
   - Ensure PostgreSQL is running
   - Verify database and user exist
   - Test connection manually with `psql`

---

**Need more help?** Check the main [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) file or create an issue in the repository.