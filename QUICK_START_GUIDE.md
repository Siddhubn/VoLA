# ITI Platform - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites
- Node.js 20.19.0 or higher
- Docker Desktop (for local database)
- Git

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd vola-stage1

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Start PostgreSQL database
npm run docker:start

# 5. Initialize database
npm run init-db
npm run init-rag

# 6. Create admin user
npm run create-admin

# 7. Start development server
npm run dev
```

### Access the Application
- **Student Portal**: http://localhost:3000
- **Admin Portal**: http://localhost:3000/master
- **API Docs**: http://localhost:3000/api

---

## 📚 Key Features

### For Students
1. **Register/Login** → Select your trade (Electrician/Fitter)
2. **Dashboard** → View progress and statistics
3. **Generate Quiz** → Select module and topic
4. **AI Chatbot** → Ask questions, get instant answers
5. **Leaderboard** → Compare with peers

### For Admins
1. **Login** → Use admin credentials
2. **Dashboard** → View system statistics
3. **User Management** → Monitor registrations
4. **Analytics** → Track quiz performance
5. **Content Quality** → Monitor RAG system

---

## 🛠️ Common Tasks

### Process New PDFs
```bash
# Place PDFs in appropriate folder
# electrician-sep-modules/TP/ or electrician-sep-modules/TT/

# Run processing
npm run process-pdfs

# Verify
npx tsx scripts/check-knowledge-data.ts
```

### Run Tests
```bash
# All tests
npm test

# Specific test
npm test -- lib/rag/__tests__/vector-search.test.ts

# Watch mode
npm run test:watch
```

### Database Management
```bash
# Check status
npm run docker:status

# Reset database
npm run docker:reset

# Verify data
npm run test-db
```

---

## 📖 Documentation

- **Full Technical Docs**: See `PROJECT_DOCUMENTATION.md`
- **Project Report**: See `PROJECT_REPORT.md`
- **API Reference**: See `/api` endpoints in code
- **Testing Guide**: See `lib/rag/__tests__/README-EMBEDDING-TESTS.md`

---

## 🐛 Troubleshooting

### Database Connection Failed
```bash
npm run docker:reset
npm run init-db
```

### Embedding Model Not Loading
```bash
rm -rf node_modules/.cache
npm install
```

### Quiz Generation Returns Empty
```bash
npx tsx scripts/check-knowledge-data.ts
npx tsx scripts/verify-modules.ts
```

---

## 📞 Support

- **Issues**: Open GitHub issue
- **Email**: support@iti-platform.com
- **Docs**: [Documentation URL]

---

## 🎯 Next Steps

1. ✅ Complete setup
2. ✅ Create test user account
3. ✅ Generate your first quiz
4. ✅ Try the AI chatbot
5. ✅ Explore admin dashboard
6. ✅ Process additional PDFs
7. ✅ Run test suite
8. ✅ Deploy to production

---

**Happy Learning! 🎓**
