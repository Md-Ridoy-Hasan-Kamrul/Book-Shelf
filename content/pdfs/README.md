# Read-online PDFs (no download)

Put a book’s PDF here using the **book slug** as the filename.

```text
content/pdfs/<book-slug>.pdf
```

Examples:

| Book slug           | File                                 |
| ------------------- | ------------------------------------ |
| `padma-nodir-majhi` | `content/pdfs/padma-nodir-majhi.pdf` |

## Rules

- Files stay **outside** `public/` and `uploads/` so browsers cannot open a direct download URL.
- The site streams pages through `/api/book-pdf/<slug>` (and API `GET /books/:slug/pdf` when the stack is live).
- The reader UI has **no download button**. True DRM is not possible in a browser; this blocks casual Save / download only.

## Demo file

`padma-nodir-majhi.pdf` ships as a one-page sample so `/books/padma-nodir-majhi/read` works in mock mode.
