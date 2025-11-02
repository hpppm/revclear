# RevClear Team Guide 🚀

Hey team! Welcome to RevClear. Here's everything you need to know to get started.

## What is RevClear?

RevClear is an AI-powered medical billing system that helps healthcare providers get paid faster. It automatically checks insurance claims for errors, predicts which claims might get denied, and fixes problems before submission. Think of it as having a super-smart assistant that catches billing mistakes 24/7!

## Getting Started

### Step 1: Clone the Repository
```bash
git clone https://github.com/hpppm/revclear.git
cd revclear
```

### Step 2: Check Out the Demo
Visit our live demo to see how it works: **https://hpppm.github.io/revclear/**

The demo shows:
- How claims flow through our system
- AI analyzing claims in real-time
- Dashboard with analytics
- Complete system architecture

### Step 3: Understand the Project Structure
```
revclear/
├── Demo/              # Interactive web demo (what you see online)
└── RevClear/          # Main application code
    ├── backend/       # Server code (Node.js + Express)
    └── frontend/      # Web app (Next.js + React)
```

## Working Together

### Making Changes (Simple Version)

**1. Before you start coding:**
```bash
git pull origin main
```
This gets the latest code from everyone.

**2. Make your changes:**
Edit files, add features, fix bugs - do your magic! ✨

**3. Save your work:**
```bash
git add .
git commit -m "Describe what you did"
git push origin main
```

**4. Let everyone know:**
Tell the team in chat what you changed so we're all on the same page.

### Tips for Happy Collaboration

- **Pull before you push** - Always get the latest code first to avoid conflicts
- **Write clear commit messages** - Help teammates understand what changed
- **Test your code** - Make sure it works before pushing
- **Ask for help** - We're a team! If you're stuck, reach out

## Common Tasks

### Running the Backend (Server)
```bash
cd RevClear/backend
npm install
npm run dev
```
Server runs on: http://localhost:3001

### Running the Frontend (Web App)
```bash
cd RevClear/frontend
npm install
npm run dev
```
Web app runs on: http://localhost:3000

### Checking the Live Demo
Just visit: https://hpppm.github.io/revclear/

## Need Help?

- **Questions about the code?** Ask the team in our group chat
- **Found a bug?** Let everyone know so we can fix it together
- **Have an idea?** Share it! We're building this together

## Important Files

- `RevClear/backend/src/` - All server logic and APIs
- `RevClear/frontend/src/` - All web app pages and components
- `Demo/` - The public-facing demo website

---

**Remember:** We're all learning and building together. Don't be afraid to ask questions, make mistakes, and help each other out. That's how great teams work! 💪

Happy coding! 🎉
