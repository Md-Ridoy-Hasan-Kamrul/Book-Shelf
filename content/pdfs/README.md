# Read-online PDFs (no download)

Prefer **remote CDN** (Cloudinary) so large PDFs stay out of git. Tiny samples may live here for offline demo.

## Remote (recommended)

Set public delivery URLs (no API secret) via env, or use the built-in map in `bookPdf` / `bookPdfService`:

```bash
BOOK_PDF_REMOTE_URLS={"my-book-slug":"https://res.cloudinary.com/CLOUD/image/upload/v1/file.pdf"}
```

Only `https://res.cloudinary.com/...` hosts are allowed (SSRF guard). The app streams bytes through `/api/book-pdf/<slug>` so the browser does not use a direct download URL in the reader.

## Local (optional / small demos)

```text
content/pdfs/<book-slug>.pdf
```

| Book slug           | File                                 |
| ------------------- | ------------------------------------ |
| `padma-nodir-majhi` | `content/pdfs/padma-nodir-majhi.pdf` |

Local is tried first; if missing, remote URL is fetched.

## Rules

- Keep PDFs **outside** `public/` and `uploads/`.
- Reader UI has **no download button**. True DRM is not possible in a browser.
