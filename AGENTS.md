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

- A branch is one unit of work: every commit on a branch carries that branch's `TYPE-N` prefix, and the prefix never changes mid-branch (e.g. branch `SPEC-1` contains `SPEC-1 Add grilling skill` and `SPEC-1 Task domain specification`).
- Starting a new unit of work means creating a new branch with the next unused number of that type.
- First word of the description is capitalized; keep it short; no trailing period.
- Other change types follow the same shape when introduced (e.g. `FIX-N`, `DOCS-N`, `SPEC-N`).
- Never commit directly to `main`: all changes land through a branch and pull request.
- Branch names are the type word plus the number only, e.g. `REPO-1`, `FEAT-2` — no description in the name.
