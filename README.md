# ReadMinder

ReadMinder is a document-aware reminder builder. Describe what matters, provide a file or data source, and it turns deadline signals into a reminder rule you can review and save.

## Why this project

Most reminder tools expect users to manually enter every date. ReadMinder explores a different workflow: let the product read the source material first, surface likely deadlines, and help the user decide when and where to be reminded.

## Current MVP

- Conversational four-step reminder builder
- Traditional Chinese and English experiences
- Local content analysis for TXT, CSV, JSON, and Markdown files
- Date and deadline-keyword extraction
- Relevant source-context preview
- Configurable lead time: 1, 3, 7, 14, or 30 days
- Reminder rules saved in browser storage
- Sample contract for trying the complete flow without uploading a file

Document analysis currently runs in the browser, so supported file contents are not uploaded to an external service.

## Current limitations

- PDF, Word, and Excel currently use filename-level signals only
- Saved reminders are device-local
- Login, scheduled checks, and live LINE/email delivery are not connected yet

## Roadmap

1. Parse PDF, DOCX, and XLSX contents
2. Add accounts and durable reminder storage
3. Add a scheduler and reminder activity log
4. Connect LINE and email delivery
5. Connect Google Drive and monitor source changes

## Tech stack

- React
- TypeScript
- vinext / Vite
- Cloudflare-compatible Sites deployment
- CSS-based responsive editorial interface

## Run locally

Requirements: Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The English version is available at `/en`.

## Build

```bash
npm run build
```

## Project status

ReadMinder is an early working MVP. The current release proves the flow from document input to extracted deadline signals and a saved reminder rule; scheduling and external notification delivery are the next milestones.
