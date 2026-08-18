<div align="center">

# aerolopa-provider

The seat map service of the [**MyPreflight**][homepage] platform. Fetches aircraft seat maps and cabin configurations
from [AeroLOPA][aerolopa] and serves them on the private network of the platform.

</div>

## About

**MyPreflight** is a briefing service and electronic flight board app for your virtual flights, providing you realistic
figures, checklists, procedures and data to perform your flight like a real pilots do. You can customize your
experience, integrate with SimBrief and other tools. Check out our homepage at [mypreflight.io][homepage].

**This module** is a serverless function that turns AeroLOPA cabin diagrams into data the platform can render:

- extracts per-seat geometry, ratings and commentary for around 1600 cabin configurations,
- resolves an airline and aircraft type to the cabin configurations that match it,
- exposes the diagram assets — vector, raster and seat hit-boxes — alongside the seat data,
- caches everything aggressively, since a configuration changes a few times a year at most.

It exists as a separate service because AeroLOPA publishes no API for this data, so the extraction reads the site's
rendered payload and is brittle by nature. Keeping it out of the API means it can change and redeploy on its own
cadence, and a failure here degrades one feature rather than the whole backend.

The backend lives in [flight-tracker-api][repo-api], the web app in [flight-tracker-app][repo-app] and the desktop
companion in [flight-tracker-transponder-app][repo-transponder].

[![integrity][ci-badge]][ci-url]
[![release][release-badge]][release-url]
[![license][license-badge]][license-url]

### Built with

[![TypeScript][ts-badge]][ts-url]
[![Node.js][node-shield]][node-url]
[![Biome][biome-badge]][biome-url]
[![Cucumber][cucumber-badge]][cucumber-url]
[![Docker][docker-badge]][docker-url]

No runtime dependencies at all — the service is the standard library plus compiled TypeScript, which keeps the
deployed image small and the cold start immediate.

## Getting started

### Environment

This app uses docker-based virtualization to run. To set up the project, follow these steps:

1. Clone the project by running:

   ```shell
   git clone git@github.com:mypreflight/aerolopa-provider.git
   ```

2. Prepare an environment variable file by copying `.env.dist` to `.env` and fill it with your data.

   ```shell
   cd aerolopa-provider
   cp .env.dist .env
   ```

3. Use docker compose to set up the environment

   ```shell
   docker compose up -d --build
   ```

   Packages will be installed automatically and the service starts in watch mode.

4. Your project should be up and running. Open the browser and go to
   [http://localhost:3001/openapi.json](http://localhost:3001/openapi.json) to see the api documentation.

### On-demand by design

This is a functions component of the `mypreflight` App Platform app — the same app the backend runs in, deployed from
this repository rather than as a separate serverless project. It scales to zero, costs nothing while nobody is asking
for a seat map, and starts on the first request, which fits a lookup the backend caches for a day and therefore calls
rarely.

```shell
curl -H "X-Require-Whisk-Auth: $SECRET" \
  "https://<app-host>/aerolopa/aerolopa/seatmap?slug=lh-359"
```

Functions reach the network through the app's public ingress and cannot be placed on a private one — they support
neither VPCs nor App Platform internal routing. The endpoint is therefore guarded by a shared secret, declared as
`webSecure` in `project.yml`. Nothing internal is exposed: the function reads a public website and returns a seat map.

`src/function.ts` is the entry point DigitalOcean calls. `scripts/dev-server.ts` wraps it in a throwaway HTTP server
so `docker compose up` gives you something to curl; it is never deployed.

### API documentation

The contract is `openapi.json` in the repository root. It is the source of truth: `flight-tracker-api` generates its
client types from it rather than restating them.

| Request                                                     | Result                                     |
| ----------------------------------------------------------- | ------------------------------------------ |
| `GET /health`                                               | liveness probe                             |
| `GET /openapi.json`                                         | this service's OpenAPI document            |
| `GET /seatmap?slug=lh-359`                                  | one seat map                               |
| `GET /seatmap?airline=LH&aircraft=32N`                      | candidate configurations, with `ambiguous` |
| `GET /seatmap?airline=LO&aircraft=7M8&includeSeatMaps=true` | candidates and every matching seat map     |
| `GET /seatmap?op=configurations`                            | the full configuration index               |

Errors answer `{ "error": { "code", "message", "status" } }` with a matching HTTP status.

### Configurations are candidates, not answers

AeroLOPA keys seat maps by airline and cabin configuration, never by registration. Of around 1600 configurations, 44%
sit in an airline and type bucket holding more than one layout — LOT's 737 MAX 8 has three. A lookup therefore returns
a list and sets `ambiguous`; choosing between them needs per-airframe knowledge this service does not have.

## Build, test and deploy

This project uses [semantic versioning](https://semver.org/spec/v2.0.0.html).

This project has configured continuous integration and continuous deployment pipelines. It uses GitHub Actions to
automatically build, test and deploy the app to the DigitalOcean. You can find the configuration in `.github/workflows`
directory.

First deployment needs the component adding to the app spec and a shared secret — see the
[deployment guide][docs-deployment].

App Platform rebuilds the component whenever `main` moves, so the workflow here only tags the version and drafts the
GitHub release. There is no image and no registry: App Platform builds from this repository using `project.yml`.

Everything runs in Docker:

```shell
docker compose exec app npm test
docker compose exec app npm run test:functional
docker compose exec app npm run typecheck
docker compose exec app npm run lint
docker compose exec app npm run build
```

`npm run build` compiles `src/` into `packages/aerolopa/seatmap/`, the layout DigitalOcean Functions requires — the two
directory names become the action path, which is why the endpoint ends `/aerolopa/seatmap`. That directory is generated
output, committed so App Platform can build from the repository, and CI fails if it drifts from `src/`. Nothing under
`packages/` is edited by hand.

Linting and formatting are a single Biome pass (`npm run lint`), configured the same way as
[flight-tracker-app][repo-app]. Everything else — the compose setup, the `.env.dist` convention, the Cucumber layout
and the workflow files — mirrors [flight-tracker-api][repo-api] so the two backends stay interchangeable to work on.

### Functional tests

`features/` follows the same layout as the backend — Gherkin grouped by domain, step definitions in
`features/_context/` (`function.context.ts` for invocation and assertions, `aerolopa.context.ts` for the upstream) and
shared helpers in `features/_helper/`. The tests call `main()` directly, the way DigitalOcean does, while AeroLOPA is
replaced by a `mockserver` container driven through its control API — the same mocking approach the backend uses.
Because the mock records what it was asked for, the suite can assert that a repeated lookup is served from cache, that
the HTML fallback fires only when the RSC response carries no seats, and that a failed lookup is never cached. Because the stub records what it was asked for, the suite can assert the things that matter most about a
scraper: that a repeated lookup is served from cache, that the HTML fallback fires only when the RSC response carries
no seats, and that a failed lookup is never cached.

```shell
docker compose exec app npx cucumber-js features/seatmap/resolve.feature
docker compose exec app npx cucumber-js --name "served from cache"
```

Fixtures for the mock live in `docker/mock/aerolopa.json`, regenerated with `npm run mock:emit`.

## Contact

My name is Oskar, an experienced programmer, cybersecurity enthusiast, and conference speaker from Poland. Feel free to
contact me via the platforms below:

<div align="center">

[![LinkedIn][linkedin-badge]][linkedin-url]
[![GitHub][github-badge]][github-url]
[![Website][web-badge]][web-url]

</div>

## License

A public domain under the [Unlicense][license-url]. Do what you want with it. I am an experienced software engineer, but
I am not connected anyhow with the airline industry. This project is created for educational purposes only and should
not be used for real-world aviation operations. Seat map diagrams and cabin data remain the property of AeroLOPA.

[linkedin-badge]: https://img.shields.io/badge/Oskar%20Barcz-0A66C2?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI%2BPHBhdGggZD0iTTIwLjQ1IDIwLjQ1aC0zLjU1di01LjU3YzAtMS4zMy0uMDMtMy4wNC0xLjg1LTMuMDQtMS44NSAwLTIuMTQgMS40NS0yLjE0IDIuOTR2NS42N0g5LjM1VjloMy40MXYxLjU2aC4wNWMuNDgtLjkgMS42NC0xLjg1IDMuMzctMS44NSAzLjYgMCA0LjI3IDIuMzcgNC4yNyA1LjQ2djYuMjl6TTUuMzQgNy40M2MtMS4xNCAwLTIuMDYtLjkzLTIuMDYtMi4wNiAwLTEuMTQuOTItMi4wNiAyLjA2LTIuMDYgMS4xNCAwIDIuMDYuOTMgMi4wNiAyLjA2IDAgMS4xNC0uOTMgMi4wNi0yLjA2IDIuMDZ6bTEuNzggMTMuMDJIMy41NlY5aDMuNTZ2MTEuNDV6TTIyLjIzIDBIMS43N0MuNzkgMCAwIC43NyAwIDEuNzN2MjAuNTRDMCAyMy4yMy43OSAyNCAxLjc3IDI0aDIwLjQ1QzIzLjIgMjQgMjQgMjMuMjMgMjQgMjIuMjdWMS43M0MyNCAuNzcgMjMuMiAwIDIyLjIzIDB6Ii8%2BPC9zdmc%2B&logoColor=white
[linkedin-url]: https://www.linkedin.com/in/oskarbarcz
[github-badge]: https://img.shields.io/badge/@oskarbarcz-181717?style=for-the-badge&logo=github&logoColor=white
[github-url]: https://github.com/oskarbarcz
[web-badge]: https://img.shields.io/badge/barcz.me-4A5568?style=for-the-badge&logo=googlechrome&logoColor=white
[web-url]: https://barcz.me
[homepage]: https://mypreflight.io
[aerolopa]: https://www.aerolopa.com
[repo-api]: https://github.com/oskarbarcz/flight-tracker-api
[repo-app]: https://github.com/oskarbarcz/flight-tracker-app
[repo-transponder]: https://github.com/oskarbarcz/flight-tracker-transponder-app
[ci-badge]: https://img.shields.io/github/actions/workflow/status/mypreflight/aerolopa-provider/integrity.yaml?branch=main&style=for-the-badge&label=integrity
[ci-url]: https://github.com/mypreflight/aerolopa-provider/actions/workflows/integrity.yaml
[release-badge]: https://img.shields.io/github/v/release/mypreflight/aerolopa-provider?style=for-the-badge
[release-url]: https://github.com/mypreflight/aerolopa-provider/releases/latest
[license-badge]: https://img.shields.io/github/license/mypreflight/aerolopa-provider?style=for-the-badge
[license-url]: https://unlicense.org
[node-shield]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[node-url]: https://nodejs.org
[ts-badge]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[ts-url]: https://www.typescriptlang.org
[docker-badge]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[docker-url]: https://www.docker.com
[docs-deployment]: docs/DEPLOYMENT.md
[biome-badge]: https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=white
[biome-url]: https://biomejs.dev
[cucumber-badge]: https://img.shields.io/badge/Cucumber-23D96C?style=for-the-badge&logo=cucumber&logoColor=white
[cucumber-url]: https://cucumber.io
