# aerolopa-provider

The seat map function: seat geometry, cabin configurations and the layout index from AeroLOPA, for the MyPreflight API.

Last reviewed: 2026-11-10

This repo is part of MyPreflight. The knowledge base lives in the product repo, [mypreflight/product](https://github.com/mypreflight/product). It is the primary source of truth for product decisions, standards and architecture. Read it by URL before working here:

- Start: https://raw.githubusercontent.com/mypreflight/product/main/CLAUDE.md
- Standards: https://raw.githubusercontent.com/mypreflight/product/main/technology/backend/standards.md
- Architecture: https://raw.githubusercontent.com/mypreflight/product/main/technology/backend/architecture.md
- Data sources: https://raw.githubusercontent.com/mypreflight/product/main/product/data-sources.md

If this file or the code contradicts the knowledge base, the knowledge base takes precedence. Flag the conflict; don't silently change either side.

## Repo-specific notes

Keep this short. Anything shared between repos belongs in the knowledge base.

- Run locally: `cp .env.dist .env`, then `docker compose up -d --build`. Compose also starts an AeroLOPA mock, so nothing touches the real site.
- Test: `docker compose exec app npm run lint`, then `npm run typecheck`, `npm test` and `npm run test:functional` the same way.
- Layout: one package at the root. `src/lambda.ts` is the Lambda entry: it checks the `Authorization: Bearer` secret and routes `/seatmap` and `/layouts` to `src/seatmap/` and `src/layouts/`, which share the client, errors, types and parsers.
- Deploy: bump `version` in `package.json` with `docker compose exec app npm version <x.y.z> --no-git-tag-version`. Merging to `main` tags the version, builds `dist.zip` with `./zip.sh` and applies the OpenTofu stack in `infra/` to AWS. The stack exports the Function URL and secret at SSM `/mypreflight/aerolopa-provider/url` and `/secret`.
- The API vendors `openapi.json` and mirrors it in hand-written types. Change the contract here and in the API together.

When your change alters product behaviour, also open a PR to the knowledge base updating the matching file.
