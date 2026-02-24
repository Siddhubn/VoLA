# VoLA Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Internal Server Error on Registration/Login

**Problem**: Getting 500 Internal Server Error when trying to create an account or login.

**Solutions**:

1. **Check if dependencies are installed**:
   ```bash
   npm install
   ```

2. **Run the setup checker**:
   ```bash
   npm run check-setup
   ```

3. **Test database connection**:
   ```bash
   npm run test-db
   ```

4. **Check the browser console and server logs**:
   - Open browser DevTools (F12) → Console tab
   - Look for error messages in the terminal where you ran `npm run dev`

5. **PostgreSQL Connection Issues**:
   - Make sure PostgreSQL is running: `brew services start postgresql` (macOS) or `sudo systemctl start postgresql` (Linux)
   - Check if the database exists: `psql -U postgres -l`
   - Verify your DATABASE_URL in `.env.local`
   - Run database initialization: `npm run init-db`

### Database Connection Errors

**Problem**: Cannot connect to PostgreSQL database.

**Solutions**:

1. **Check PostgreSQL Status**:
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Ubuntu/Debian
   sudo systemctl status postgresql
   
   # Check if PostgreSQL is listening
   netstat -an | grep 5432
   ```

2. **Start PostgreSQL**:
   ```bash
   # macOS
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo systemctl start postgresql
   ```

3. **Verify Database Exists**:
   ```bash
   psql -U postgres -c "CREATE DATABASE vola_db;"
   ```

4. **Check Environment Variables**:
   - Ensure `.env.local` exists with correct DATABASE_URL
   - Format: `postgresql://username:password@localhost:5432/vola_db`

### App Won't Start

**Problem**: `npm run dev` fails or shows errors.

**Solutions**:

1. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check Node.js version**:
   - Ensure you have Node.js 18+ installed
   - Run: `node --version`

4. **Initialize database**:
   ```bash
   npm run init-db
   ```

### Authentication Not Working

**Problem**: Can't login or registration doesn't work.

**Solutions**:

1. **Clear browser cookies**:
   - Open DevTools → Application → Cookies
   - Delete all cookies for localhost:3000

2. **Check database tables**:
   ```bash
   npm run test-db
   ```

3. **Password requirements**:
   - Password must be at least 6 characters
   - Must contain uppercase, lowercase, and number

4. **Check server logs**:
   - Look for database connection errors
   - Verify user creation in PostgreSQL

### Dashboard Not Loading

**Problem**: Dashboard shows errors or doesn't load user data.

**Solutions**:

1. **Check authentication**:
   - Make sure you're logged in
   - Try logging out and logging back in

2. **Clear browser cache**:
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

3. **Check network tab**:
   - Open DevTools → Network tab
   - Look for failed API requests

4. **Verify database data**:
   ```bash
   npm run test-db
   ```

### NPM Vulnerabilities

**Problem**: Getting vulnerability warnings during `npm install`.

**Solutions**:

1. **Update dependencies**:
   ```bash
   npm update
   ```

2. **Run audit fix**:
   ```bash
   npm audit fix
   ```

3. **Force fix (if safe)**:
   ```bash
   npm audit fix --force
   ```

4. **Check specific vulnerabilities**:
   ```bash
   npm audit
   ```

## 🔧 PostgreSQL Specific Issues

### Connection Refused (ECONNREFUSED)
- PostgreSQL is not running
- Wrong host or port in DATABASE_URL
- Firewall blocking connection

### Authentication Failed (28P01)
- Wrong username or password
- User doesn't exist
- Check DATABASE_URL credentials

### Database Does Not Exist (3D000)
- Database not created
- Wrong database name in URL
- Run: `CREATE DATABASE vola_db;`

### Permission Denied
- User lacks database permissions
- Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE vola_db TO username;`

## 🐛 Debug Steps

1. **Check setup**:
   ```bash
   npm run check-setup
   ```

2. **Test database**:
   ```bash
   npm run test-db
   ```

3. **Initialize database**:
   ```bash
   npm run init-db
   ```

4. **Start with verbose logging**:
   ```bash
   npm run dev
   ```

5. **Test API endpoints manually**:
   ```bash
   # Test registration
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@example.com","password":"Test123!","role":"student"}'
   ```

6. **Check browser DevTools**:
   - Console for JavaScript errors
   - Network for API request failures
   - Application for cookie issues

7. **Check PostgreSQL directly**:
   ```bash
   psql -U postgres -d vola_db -c "SELECT * FROM users LIMIT 5;"
   ```

## 📞 Getting Help

If you're still having issues:

1. **Check error messages in**:
   - Browser console (F12 → Console)
   - Terminal where you ran `npm run dev`
   - PostgreSQL logs

2. **Common error patterns**:
   - `Module not found`: Run `npm install`
   - `ECONNREFUSED`: PostgreSQL not running
   - `DATABASE_URL`: Check `.env.local` file
   - `3D000`: Database doesn't exist

3. **Run diagnostic commands**:
   ```bash
   npm run check-setup
   npm run test-db
   pg_isready -h localhost -p 5432
   ```

## ✅ Quick Test

To verify everything is working:

1. **Full setup**:
   ```bash
   npm run setup
   ```

2. **Or step by step**:
   ```bash
   npm install
   npm run init-db
   npm run test-db
   npm run dev
   ```

3. **Test the application**:
   - Open: http://localhost:3000
   - Click "Get Started"
   - Fill the registration form
   - You should be redirected to the dashboard

If you see the dashboard with your name and a green banner saying "Connected to PostgreSQL database", everything is working perfectly! 🎉

## 📚 Additional Resources

- [PostgreSQL Setup Guide](./POSTGRESQL_SETUP.md) - Detailed PostgreSQL installation and configuration
- [README.md](./README.md) - Complete application documentation
- PostgreSQL Documentation: https://www.postgresql.org/docs/