## Tennis Court Scheduler (Team of 10)

This is a small, mobile-friendly web app to help your tennis squad of up to ~10 players coordinate **availability based on nearby courts**.

### What it does now

- **Players**: Start with 10 default players (you + 9 teammates). You can add more if needed.
- **Courts**:
  - Add nearby courts with a **name**, optional **address/notes**, and an approximate **distance in miles** from your usual meetup point (home, club, etc.).
  - The distance is used to filter for "nearby" courts.
- **Availability grid**:
  - Choose a **player**, **court**, and **day** of the week.
  - Tap morning / afternoon / evening cells to **toggle availability** for that combination.
  - The grid shows who is free in each time window at the currently selected court and day.
- **Best-session suggestion**:
  - Set a **max distance** in miles.
  - The app scans all availability and highlights the **best court + day + time window** that:
    - Is within your distance filter.
    - Has the **largest number of players available**.

All data is in-memory for now (no backend, no login), which is ideal for trying the flow. We can later extend it to persistent storage or sharing if you’d like.

### Project structure

- `index.html` – basic HTML shell.
- `package.json` – dependencies and scripts (React + Vite + TypeScript).
- `vite.config.ts` – Vite config with the React plugin.
- `tsconfig.json` – TypeScript config.
- `src/main.tsx` – React entry point.
- `src/App.tsx` – main UI and scheduling logic.
- `src/styles.css` – modern, dark, mobile-first styling.

### How to run it locally

1. **Install Node.js** (if you don’t have it yet)
   - Recommended: install via `https://nodejs.org` (LTS version is fine).

2. **Install dependencies**

   ```bash
   cd tennis-court-scheduler
   npm install
   ```

3. **Start the dev server**

   ```bash
   npm run dev
   ```

4. Open the URL that Vite prints (usually `http://localhost:5173`) in your browser.

### Host on GitHub Pages

1. **Create a GitHub repo** (if you haven’t already)  
   - On GitHub: **New repository** → name it `tennis-court-scheduler` (or any name; if different, update `base` in `vite.config.ts` to match, e.g. `base: "/your-repo-name/"`).

2. **Push your code**
   ```bash
   cd tennis-court-scheduler
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/tennis-court-scheduler.git
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your GitHub username.

3. **Turn on GitHub Pages**
   - Repo → **Settings** → **Pages**.
   - Under **Build and deployment**, set **Source** to **GitHub Actions**.

4. **Deploy**
   - Each push to `main` will run the workflow in `.github/workflows/deploy.yml`, build the app, and deploy it.
   - After the first run, the site will be at:  
     **https://YOUR_USERNAME.github.io/tennis-court-scheduler/**

   **Optional – deploy from your machine once:**  
   `npm run deploy` (builds and pushes the `dist` folder to the `gh-pages` branch; you’d then set Pages source to that branch if you prefer).

### How to use the app with your team

- **Step 1 – Set up courts**
  - Add the 2–5 courts your team commonly uses.
  - Enter rough distances (e.g. `0.5`, `1.5`, `3.0` miles).

- **Step 2 – Fill availability**
  - For each player:
    - Select their name.
    - Choose a court and day.
    - Tap morning / afternoon / evening to mark when they’re free there.
  - Repeat for each court you’re willing to use.

- **Step 3 – Find the optimal slot**
  - Set the max distance (e.g. `5` miles).
  - Check the highlighted “Best session” summary:
    - Court, day, time window.
    - List of players available.

This gives you a quick, visual way to answer: **“When and where can the most teammates play, without traveling too far?”**

### Next possible improvements

If you’d like, we can extend this with:

- Per-player distance limits.
- Exact time ranges instead of coarse time-of-day slots.
- Browser storage (localStorage) so data survives refresh.
- A simple backend (e.g. Node + SQLite or Supabase) so all 10 teammates can update their own availability from their phones.

