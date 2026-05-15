# Complaint Registration Platform

A full-stack application for submitting and managing complaints with AI-powered follow-up questions.

## How to Run

### 1. Backend Setup
1. Navigate to the `Backend` folder.
2. Install dependencies: `npm install`.
3. Create a `.env` file with your credentials (see `Backend/.env` for required fields).
4. Start the server: `npm run dev`.
   - The backend runs on `http://localhost:3000`.

### 2. Frontend Setup
There are two ways to run the frontend:

#### Option A: Using VS Code "Live Server" Extension (Recommended)
1. Open the project in VS Code.
2. Right-click `Frontend/index.html`.
3. Select **"Open with Live Server"**.
4. The frontend will open at `http://127.0.0.1:5500/Frontend/index.html`.

#### Option B: Using the Command Line
1. Navigate to the root directory.
2. Run `npm run start:frontend` (requires `live-server` to be installed or it will use `npx`).
   - Or just run: `npx live-server Frontend`

## Troubleshooting "Live Server is not open"
If you are double-clicking `index.html` from your file explorer, it will open as a `file://` which is **not** a live server. Many features like cookies and API calls may not work correctly. Always use one of the methods above to serve the files over `http://`.
