<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commit conventions

Commit messages follow the pattern `TYPE-N Short description`:

- `REPO-N` — repository setup, scaffolding, tooling, and configuration (e.g. `REPO-1 Setting up and scaffolding`)
- `FEAT-N` — user-facing feature work (e.g. `FEAT-1 Task list page`)

Rules:

- `N` identifies a unit of work. Increment it when starting a new unit of that type; reuse it for follow-up commits within the same unit.
- First word of the description is capitalized; keep it short; no trailing period.
- Other change types follow the same shape when introduced (e.g. `FIX-N`, `DOCS-N`, `SPEC-N`).
- Never commit directly to `main`: all changes land through a branch and pull request.
- Branch names are the type word plus the number only, e.g. `REPO-1`, `FEAT-2` — no description in the name.
