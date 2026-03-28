# RALPH MVP — Dev Ready

A clean, extract-and-open VS Code workspace for the RALPH MVP.

## What this includes
- Express server
- Mobile-friendly frontend
- Today Mode
- Deals screen
- Intelligence screen
- Posts screen
- New Deal capture
- JSON demo persistence
- Clean folder structure for expansion

## Quick start

```bash
npm install
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Folder structure

```text
ralph-dev-ready/
├── package.json
├── README.md
├── .gitignore
├── .vscode/
├── data/
├── public/
└── src/
    ├── server.js
    └── routes/
```

## Notes
- This is a clean MVP workspace, not the full production RALPH platform.
- Data is stored in local JSON files inside `/data`.
- Your developer can replace the JSON layer with PostgreSQL later.
