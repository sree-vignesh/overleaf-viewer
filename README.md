# Overleaf Viewer

Overleaf Viewer is a small utility that converts a public Overleaf share link into a permanent, stable URL that always serves the latest compiled PDF. This solves the common problem where Overleaf does not provide a static `.pdf` link for public projects.

The frontend extracts the token from a standard Overleaf share URL, while the backend handles Overleaf's internal workflow (CSRF, cookies, grant access, project load, compile) and returns the final PDF URL.

This allows you to use a stable link in resumes, portfolios, or websites without needing to manually upload updated PDFs.

---

## Features

- Accepts public Overleaf share links of the form
  `https://www.overleaf.com/read/<token>`
- Generates a clean, static URL like
  `https://overleaf-viewer.vercel.app/view/<token>`
- Automatically retrieves CSRF token, cookies, project ID, and metadata
- Executes Overleaf compile workflow and returns final PDF link
- Supports caching to minimize Overleaf requests
- No need to re-upload updated resumes or documents anywhere

---

## How It Works

### Frontend (Next.js)

The frontend provides:

- A simple input box for the Overleaf share URL
- A parser that extracts the Overleaf token using
  `/\/read\/([a-z0-9]+)#?/i`
- A generated permanent link in the form
  `/view/<token>`
- One-click copy functionality

### Backend (Next.js Route + Axios)

The backend:

1. Loads the Overleaf read page
2. Extracts CSRF token, cookies, referer
3. Sends the grant request to obtain project access
4. Loads the project HTML to extract metadata
5. Compiles the project through Overleaf's API
6. Finds the latest PDF file
7. Builds the final PDF download link
8. Caches the result to avoid unnecessary recompiles

Caching can be configured with NodeCache:

```js
const cache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
```

A TTL of 0 effectively disables automatic expiration.

For example:

```js
const cache = new NodeCache({ stdTTL: 600 });
```

Has a timeout of 10 minutes.

Note: Remove the checkperiod completely to enable caching.

---

## API Route Overview

The backend route performs the following steps:

```
/api/view/[token]

1. Validate token format
2. Check in-memory cache
3. GET /read/<token>
4. POST /read/<token>/grant
5. GET /project/<projectId>
6. POST /project/<projectId>/compile
7. Extract PDF file and return final link
```

The final response format:

```json
{
  "pdf": "https://...compiled.pdf"
}
```

---

## Example Usage

1. Open Overleaf and enable link sharing:
   Settings → Share → Turn on "Link sharing"
2. Copy the share URL:
   `https://www.overleaf.com/read/abcd1234efgh`
3. Paste into the web UI
4. Receive:
   `https://overleaf-viewer.vercel.app/view/abcd1234efgh`
5. Use this link anywhere (portfolio, resume, website)

The link will always resolve to the latest version of the compiled PDF.

---

## Project Structure

```
.
├── app/
│   ├── page.jsx              Frontend input UI
│   └── api/
│       └── overleaf/
│           └── [token]/route.js   Overleaf handler logic
├── public/
├── package.json
├── README.md
└── ...
```

---

## Requirements

- Node.js 18+
- Next.js 14+
- Axios
- NodeCache

Install dependencies:

```
npm install
```

Run development server:

```
npm run dev
```

---

## Notes

- This project relies on Overleaf's internal API endpoints and HTML structure.
  If Overleaf changes their implementation, updates may be required.
- No login or Overleaf account access is needed.
  Only publicly shared projects are supported.
- This tool does not store or log PDFs.
  Only the final Overleaf PDF link is returned.

---
