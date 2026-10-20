# aerolopa-provider

The seat map functions: seat geometry, cabin configurations and the layout index from AeroLOPA, for the MyPreflight API.

Last reviewed: 2026-10-20

This repo is part of MyPreflight. Product decisions, standards and architecture live in the knowledge base. Read it by URL before working here:

- Start: https://raw.githubusercontent.com/mypreflight/product/main/CLAUDE.md
- Standards: https://raw.githubusercontent.com/mypreflight/product/main/technology/backend/standards.md
- Architecture: https://raw.githubusercontent.com/mypreflight/product/main/technology/backend/architecture.md
- Data sources: https://raw.githubusercontent.com/mypreflight/product/main/product/data-sources.md

## Repo-specific notes

Keep this short. Anything shared between repos belongs in the knowledge base.

- Run locally: `cp .env.dist .env`, then `docker compose up -d --build`. Compose also starts an AeroLOPA mock, so nothing touches the real site.
- Test: per function (`seatmap`, `layouts`): `docker compose exec <function> npm run lint`, `npm run typecheck`, `npm test` and the functional tests.
- Deploy: every function carries the same version. Bump both with `npm version <x.y.z> --no-git-tag-version --prefix packages/aerolopa/<function>`. Merging to `main` tags the version; App Platform builds from `project.yml`.
- The API vendors `openapi.json` and mirrors it in hand-written types. Change the contract here and in the API together.

When your change alters product behaviour, also open a PR to the knowledge base updating the matching file.
