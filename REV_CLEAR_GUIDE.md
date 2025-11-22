# RevClear Quick Git & Workflow Guide

1. Clone the repo  
   `git clone <repo-url>`

2. Open in VS Code

   - Launch VS Code, open the cloned folder.

3. Open a terminal in VS Code

   - Use the integrated terminal (`View` → `Terminal`).

4. Install Gemini CLI (one-time)  
   `npm install -g @google/geminiai-cli` (or the CLI your setup requires).

5. From an external terminal (e.g., PowerShell on Windows), navigate to the project folder and run Gemini  
   `cd <project-folder>`  
   `gemini`

6. Tell Gemini (first prompt):

   ```
   Hello Gemini, please read:
   backend/docs/BACKEND_REVCLEAR_v1.0.0.md
   ```

   ```Your next actions are to Suggest 2 tickets that we should do from TICKET.md file

   ```

7. Pick one of the tickets Gemini suggests and run from vscode terminal:

   - `git pull` (sync main)
   - `git checkout -b <branch-name-from-ticket>`

8. Run the apps (set env vars first in `backend/.env`, `frontend/.env`, `testing-dashboard/.env`):

   - Backend:
     ```
     cd backend
     npm install
     npm run dev
     ```
     API runs at `http://localhost:3005`.
   - Testing dashboard:
     ```
     cd testing-dashboard
     npm install
     npm run dev
     ```
     Served at `http://localhost:3000` (Next.js rewrites proxy `/api/*` to backend).
   - Frontend (Demo):
     ```
     cd Demo
     npm install
     npm run dev
     ```

9. Tell Gemini (second prompt):  
   “Branch has been changed, lets create a plan to implement the Ticket number [], no code yet.”

10. Review Gemini’s plan. Suggest changes or accept.

- Watch which files it wants to modify; avoid auto-accepting suggestions.

11. Follow instructions critically; keep an eye on file changes.

    - Update TICKET.md status as you advance.

12. When ready to commit (after tests/pass):
    ```
    git pull origin main
    git add .
    git commit -m "<short description – see TICKET_STRUCTURE>"
    git push origin <branch-name>
    git checkout main
    git status
    ```
    Work is done if `git status` on main looks clean.

Tip: each folder may have its own README; check for any extra setup. Ensure your `.env` files include AWS/Cognito/RDS settings before starting services.
