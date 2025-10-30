# 🚀 Project Standards & Developer Guide

This document outlines the essential guidelines and conventions for contributing to the AI-Powered Medical Billing System project. Adhering to these standards ensures consistency, maintainability, and a smooth collaborative development experience, especially for team members new to Git and modern development workflows.

## 1. Running the Project Locally

To get the project up and running on your local machine, follow these steps:

### a. Backend Setup

Refer to the detailed instructions in [`backend/TODO.md`](./backend/TODO.md) for setting up the backend, including environment variables and dependencies.

**Quick Start (after initial setup):**

```bash
cd backend
npm install # Only if dependencies changed
npm run dev
```

### b. Frontend Setup

Refer to the detailed instructions in [`frontend/TODO.md`](./frontend/TODO.md) for setting up the frontend, including environment variables and dependencies.

**Quick Start (after initial setup):**

```bash
cd frontend
npm install # Only if dependencies changed
npm run dev
```

Once both are running, you can access the frontend at `http://localhost:3000` (or as configured) and the backend API at `http://localhost:3001` (or as configured).

## 2. Git Workflow & Commands

We will follow a simplified **GitHub Flow** for managing our codebase. This means all development happens on feature branches, which are then merged into `main` via Pull Requests.

### a. Basic Git Commands

- **Clone the repository:**
  ```bash
  git clone <repository-url>
  cd MedicalSystem
  ```
- **Check status:** See what changes you've made.
  ```bash
  git status
  ```
- **Add changes to staging:** Prepare your changes for commit.
  ```bash
  git add .
  # or for specific files:
  # git add path/to/your/file.js
  ```
- **Commit changes:** Save your changes with a descriptive message.
  ```bash
  git commit -m "Your descriptive commit message"
  ```
- **Pull latest changes:** Get updates from the remote repository.
  ```bash
  git pull origin main
  ```
- **Push changes:** Upload your committed changes to the remote repository.
  ```bash
  git push origin <your-branch-name>
  ```
- **Create a new branch:**
  ```bash
  git checkout -b <new-branch-name>
  ```
- **Switch branches:**
  ```bash
  git checkout <existing-branch-name>
  ```

### b. Branch Naming Conventions

Use clear, concise, and descriptive names for your branches. Prefix them to indicate their purpose:

- **`feature/<descriptive-name>`**: For new features (e.g., `feature/user-login`, `feature/patient-dashboard`).
- **`bugfix/<descriptive-name>`**: For bug fixes (e.g., `bugfix/auth-redirect`, `bugfix/claim-display-error`).
- **`chore/<descriptive-name>`**: For maintenance tasks, refactoring, or build process changes (e.g., `chore/update-dependencies`, `chore/refactor-auth-middleware`).
- **`docs/<descriptive-name>`**: For documentation updates (e.g., `docs/update-readme`, `docs/add-api-routes`).

**Examples:**

- `git checkout -b feature/implement-firebase-auth`
- `git checkout -b bugfix/fix-login-validation`

### c. Pull Requests (PRs)

- Always create a Pull Request to merge your feature/bugfix branch into `main`.
- Ensure your branch is up-to-date with `main` before creating a PR.
- Provide a clear title and description for your PR, explaining the changes and why they were made.
- Request reviews from at least one other team member.

## 3. Naming Conventions

Consistency in naming makes the codebase easier to read and understand.

### a. Folders

- Use `kebab-case` for folder names (e.g., `user-management`, `api-routes`).
- Group related files within logical folders.

### b. Files

- Use `kebab-case` for most file names (e.g., `patient-list.tsx`, `auth-middleware.ts`).
- For components, use `PascalCase` for the component name itself, but `kebab-case` for the file name if it's a single component per file (e.g., `PatientCard.tsx` in `patient-card.tsx`).
- For utility files, use `camelCase` or `kebab-case` depending on context (e.g., `utils/helpers.ts`, `utils/date-format.ts`).

### c. Code (Variables, Functions, Classes)

- **Variables & Functions:** Use `camelCase` (e.g., `userName`, `fetchPatients`).
- **Classes & Components:** Use `PascalCase` (e.g., `User`, `PatientCard`).
- **Constants:** Use `SCREAMING_SNAKE_CASE` for global constants (e.g., `API_BASE_URL`).
- **Types/Interfaces:** Use `PascalCase` (e.g., `Patient`, `EncounterData`).

## 4. Git Commit Message Conventions

Clear and consistent commit messages are vital for understanding the project's history. We will use a simplified version of Conventional Commits.

Each commit message should be structured as follows:

```
<type>: <short description>

[optional body]

[optional footer(s)]
```

### a. Type

Must be one of the following:

- **`feat`**: A new feature.
- **`fix`**: A bug fix.
- **`docs`**: Documentation only changes.
- **`style`**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc).
- **`refactor`**: A code change that neither fixes a bug nor adds a feature.
- **`perf`**: A code change that improves performance.
- **`test`**: Adding missing tests or correcting existing tests.
- **`chore`**: Other changes that don't modify src or test files (e.g., build process, auxiliary tools, libraries updates).

### b. Short Description

A concise, imperative statement describing the change. Max 50-72 characters.

- Use the imperative mood ("add feature" not "added feature").
- Don't capitalize the first letter.
- No period at the end.

### c. Optional Body

Provide more context about the change. Explain _what_ and _why_ you made the change, not _how_ (the code itself shows how).

### d. Optional Footer(s)

Reference issues or PRs (e.g., `Fixes #123`, `Closes #456`).

**Examples:**

```
feat: add user login functionality

This commit introduces the user login feature, allowing clinicians to authenticate
using their Firebase credentials. It includes form validation and redirects
authenticated users to the dashboard.
```

```
fix: correct patient data display error

Resolves an issue where patient dates of birth were incorrectly formatted
on the patient details page. The date utility function was updated to ensure
consistent 'YYYY-MM-DD' format.

Fixes #789
```

```
chore: update all npm dependencies

Updated all project dependencies to their latest stable versions to address
security vulnerabilities and leverage new features.
```

---
