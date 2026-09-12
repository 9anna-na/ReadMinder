# ReadMinder

ReadMinder is a document-aware reminder builder. Describe what matters, provide a file or data source, and it turns deadline signals into a reminder rule you can review and save.

## Why this project

Most reminder tools expect users to manually enter every date. ReadMinder explores a different workflow: let the product read the source material first, surface likely deadlines, and help the user decide when and where to be reminded.

## Current MVP

- Conversational four-step reminder builder
- Traditional Chinese and English experiences
- Local content analysis for text-based PDF, DOCX, XLS/XLSX, TXT, CSV, JSON, and Markdown files
- Date and deadline-keyword extraction
- Relevant source-context preview
- Configurable lead time: 1, 3, 7, 14, or 30 days
- Authenticated reminder rules saved to a user-owned cloud database
- Email recipient setup with explicit consent
- Resend-powered confirmation email after a reminder is saved
- Scheduled email reminders for dates within the provider's scheduling window
- Daily automatic scheduling for saved reminders as they enter that window
- Reminder dashboard with filters, timing edits, pause/resume, and safe deletion
- Sample contract for trying the complete flow without uploading a file

Document analysis currently runs in the browser, so supported file contents are not uploaded during analysis. When you save a reminder, the reminder details, selected dates, recipient email, and extracted analysis summary are stored in the site's Cloudflare database. Resend receives the information needed to send confirmation and reminder emails.

## Deployment and authentication boundary

ReadMinder is designed to run as an OpenAI Site. Its server routes trust the authenticated-user headers added by the Sites platform and reject requests when those headers are missing or malformed.

Do not expose this app through another host or reverse proxy without adding an equivalent trusted authentication layer. On an independently hosted copy, a visitor could otherwise supply those headers themselves. Authentication and ownership checks are enforced on the server; browser controls are not treated as authorization.

## Current limitations

- Scanned/image-only PDFs need OCR and are not readable yet
- Password-protected PDFs and legacy `.doc` files are not supported
- Large documents are capped at 10 MB and 250,000 extracted characters for browser performance
- Test-mode confirmation emails can only be sent to the address registered with Resend
- LINE, Slack, push, and calendar delivery are marked as coming soon

## Roadmap

1. Add reminder delivery activity history
2. Connect LINE delivery
3. Add OCR for scanned documents
4. Connect Google Drive and monitor source changes

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

ReadMinder is an early working MVP. The current release proves the flow from document input to extracted deadline signals, a saved reminder rule, and scheduled email delivery. Delivery history and additional channels are the next milestones.
