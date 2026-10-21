# aerolopa-provider

The seat map functions: seat geometry, cabin configurations and the layout index from AeroLOPA, for the MyPreflight API.

Last reviewed: 2026-10-20

This repo is part of MyPreflight. The knowledge base lives in the product repo, [mypreflight/product](https://github.com/mypreflight/product). It is the primary source of truth for product decisions, standards and architecture. Read it by URL before working here:

- Start: https://raw.githubusercontent.com/mypreflight/product/main/CLAUDE.md
- Standards: https://raw.githubusercontent.com/mypreflight/product/main/technology/backend/standards.md
- Architecture: https://raw.githubusercontent.com/mypreflight/product/main/technology/backend/architecture.md
- Data sources: https://raw.githubusercontent.com/mypreflight/product/main/product/data-sources.md

If this file or the code contradicts the knowledge base, the knowledge base takes precedence. Flag the conflict; don't silently change either side.

## Repo-specific notes

Keep this short. Anything shared between repos belongs in the knowledge base.

- Run locally: `cp .env.dist .env`, then `docker compose up -d --build`. Compose also starts an AeroLOPA mock, so nothing touches the real site.
- Test: per function (`seatmap`, `layouts`): `docker compose exec <function> npm run lint`, `npm run typecheck`, `npm test` and the functional tests.
- Deploy: every function carries the same version. Bump both with `npm version <x.y.z> --no-git-tag-version --prefix packages/aerolopa/<function>`. Merging to `main` tags the version; App Platform builds from `project.yml`.
- The API vendors `openapi.json` and mirrors it in hand-written types. Change the contract here and in the API together.

When your change alters product behaviour, also open a PR to the knowledge base updating the matching file.
