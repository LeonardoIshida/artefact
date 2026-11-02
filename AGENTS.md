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

## Project structure

- `app/` — Next.js routes, pages, and API handlers (frontend + backend in one repo).
- `domain/` — framework-free domain modules. Each domain (e.g. `domain/task/`) is split into `entity.ts` (types/constants), `errors.ts` (domain errors), `validation.ts` (pure input parsers), and `index.ts` (barrel). Tests live next to the module as `*.test.ts`.
- `public/` — static assets.

- **Comments explain *why*, not *what***: Any comment that is not a function summary (docblock) must explain *why* the code does something (the invariant, constraint, or trade-off), never *what* the code is doing. If code needs a "what" comment to be understood, rename symbols or simplify the structure instead.
- **Deep modules (`codebase-design`)**: Prefer small interfaces hiding substantial behavior at clean seams. Do not leak internal helpers or representation details across module interfaces.
- **Test-driven development (`tdd`)**: Build in vertical red-green slices against confirmed public seams. Tests must exercise observable behavior through the public interface, use independent expected literals (never tautological recomputations), and avoid mocking internal collaborators.
- **Strict contracts & zero-library domain validation**: Maintain strict TypeScript types without `any`. Domain input parsers are pure functions with hand-rolled validation (no `zod`) that normalize inputs, reject unknown keys, and throw typed domain errors.
