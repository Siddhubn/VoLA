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

3. **Check the browser console and server logs**:
   - Open browser DevTools (F12) → Console tab
   - Look for error messages in the terminal where you ran `npm run dev`

4. **MongoDB Connection Issues**:
   - The app will automatically fallback to in-memory storage if MongoDB is not available
   - You should see a message: "MongoDB not available, using simple auth fallback"
   - This is normal and the app will work fine for testing

5. **Environment Variables**:
   - Make sure `.env.local` exists (copy from `.env.local` if needed)
   - Check that `JWT_SECRET` is set in `.env.local`

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

### Authentication Not Working

**Problem**: Can't login or registration doesn't work.

**Solutions**:

1. **Clear browser cookies**:
   - Open DevTools → Application → Cookies
   - Delete all cookies for localhost:3000

2. **Check if running in fallback mode**:
   - Look for blue info banner on dashboard: "Running in demo mode"
   - This means MongoDB is not connected (which is fine for testing)

3. **Password requirements**:
   - Password must be at least 6 characters
   - Must contain uppercase, lowercase, and number

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

## 🔧 Development Mode Features

### In-Memory Storage (Fallback Mode)

When MongoDB is not available, the app automatically switches to in-memory storage:

- ✅ All authentication features work
- ✅ User registration and login
- ✅ Dashboard with user data
- ⚠️ Data is lost when server restarts
- ℹ️ Perfect for development and testing

### MongoDB Mode

When MongoDB is connected:

- ✅ Persistent data storage
- ✅ All features work
- ✅ Data survives server restarts

## 🐛 Debug Steps

1. **Check setup**:
   ```bash
   npm run check-setup
   ```

2. **Start with verbose logging**:
   ```bash
   npm run dev
   ```

3. **Test API endpoints manually**:
   ```bash
   # Test registration
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@example.com","password":"Test123!","role":"student"}'
   ```

4. **Check browser DevTools**:
   - Console for JavaScript errors
   - Network for API request failures
   - Application for cookie issues

## 📞 Getting Help

If you're still having issues:

1. Check the error messages in:
   - Browser console (F12 → Console)
   - Terminal where you ran `npm run dev`

2. Common error patterns:
   - `Module not found`: Run `npm install`
   - `ECONNREFUSED`: MongoDB connection issue (app will use fallback)
   - `JWT_SECRET`: Check `.env.local` file

3. The app is designed to work without MongoDB, so most issues are related to:
   - Missing dependencies
   - Environment configuration
   - Browser cache/cookies

## ✅ Quick Test

To verify everything is working:

1. Start the app: `npm run dev`
2. Open: http://localhost:3000
3. Click "Get Started"
4. Fill the registration form
5. You should be redirected to the dashboard

If you see the dashboard with your name and a blue info banner saying "Running in demo mode", everything is working perfectly! 🎉