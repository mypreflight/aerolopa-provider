<div align="center">

[![aerolopa-provider][banner]][homepage]

The seat map function of the [**MyPreflight**][homepage] platform. Fetches aircraft seat maps, cabin
configurations and the layout index from [AeroLOPA][aerolopa], on demand, as an AWS Lambda behind a Function URL.

</div>

## About

**MyPreflight** is a briefing service and electronic flight board app for your virtual flights, providing you realistic
figures, checklists, procedures and data to perform your flight like a real pilots do. You can customize your
experience, integrate with SimBrief and other tools. Check out our homepage at [mypreflight.io][homepage].

**This module** is a serverless function with two routes that turn AeroLOPA cabin diagrams into data the platform can
render:

- extracts per-seat geometry, ratings and commentary for around 1600 cabin configurations,
- resolves an airline and aircraft type to the cabin configurations that match it,
- lists every published layout by id, so the platform can populate a picker without reading a single seat map,
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

No runtime dependencies at all — the function is the standard library plus TypeScript bundled into one file by
esbuild, which keeps the deployed artifact small and the cold start immediate.

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

4. Your project should be up and running. `docker compose` also starts an `aerolopa-mock` container, so the
   function answers without touching the real site. Both routes share one port and want the secret from `.env`:

   ```shell
   curl -H "Authorization: Bearer $AEROLOPA_FUNCTION_SECRET" "http://localhost:3001/seatmap?slug=lh-32n"
   curl -H "Authorization: Bearer $AEROLOPA_FUNCTION_SECRET" "http://localhost:3001/layouts"
   ```

### On-demand by design

This is one AWS Lambda function, `nodejs24.x` on arm64, behind a Function URL. It scales to zero, costs nothing while
nobody is asking for a seat map, and starts on the first request, which fits a lookup the backend caches for a day and
therefore calls rarely.

```shell
URL=$(aws ssm get-parameter --name /mypreflight/aerolopa-provider/url --query Parameter.Value --output text)
SECRET=$(aws ssm get-parameter --name /mypreflight/aerolopa-provider/secret --with-decryption \
  --query Parameter.Value --output text)

curl -H "Authorization: Bearer $SECRET" "$URL/seatmap?slug=lh-359"
curl -H "Authorization: Bearer $SECRET" "$URL/layouts"
```

The Function URL uses auth type `NONE`, so it is reachable from anywhere. The function therefore checks a shared
secret itself, before it routes or reads anything: the bearer token must match `AEROLOPA_FUNCTION_SECRET`, which the
stack generates. Nothing internal is exposed: the function reads a public website and returns a seat map.

The source lives in `src/`. `src/lambda.ts` is the entry point Lambda calls: it checks the secret and routes `/seatmap`
and `/layouts` to their handlers in `src/seatmap/` and `src/layouts/`, which share one AeroLOPA client, cache and
parsers. `scripts/dev-server.ts` wraps that entry point in a throwaway HTTP server so `docker compose up` gives you
something to curl; it is never deployed.

### API documentation

The contract is `openapi.json` in the repository root — `GET /seatmap` and `GET /layouts`, both requiring an
`Authorization: Bearer` header. It is the source of truth: `flight-tracker-api` generates its client types from it
rather than restating them.

Both routes take query parameters. `GET /seatmap`:

| Arguments                                      | Result                                     |
| ---------------------------------------------- | ------------------------------------------ |
| `slug=lh-359`                                  | one seat map                               |
| `airline=LH&aircraft=32N`                      | candidate configurations, with `ambiguous` |
| `airline=LO&aircraft=7M8&includeSeatMaps=true` | candidates and every matching seat map     |
| `op=configurations`                            | the full configuration index               |

`GET /layouts` takes no arguments and answers with the id of every published layout, the airline and aircraft
IATA codes parsed out of it, and the trailing discriminator that separates several layouts of the same pair:

```json
{
  "count": 1601,
  "layouts": [
    { "id": "lh-32n", "airlineIata": "LH", "aircraftIata": "32N", "variant": null },
    { "id": "lo-7m8-1", "airlineIata": "LO", "aircraftIata": "7M8", "variant": "1" }
  ]
}
```

The whole index comes from one sitemap read, so the call is cheap — around 115 kB and a single upstream request, cached
for a day. Nothing richer is available at that price: aircraft names, cabins and seat counts live inside each layout's
own payload, so reaching them means one request per layout and belongs in `/seatmap`.

Errors answer `{ "error": { "code", "message", "status" } }` with a matching status: `400` bad arguments, `401` a
missing or wrong secret, `404` unknown configuration or path, `502` AeroLOPA unreachable or unparseable, `500` anything
else.

### Configurations are candidates, not answers

AeroLOPA keys seat maps by airline and cabin configuration, never by registration. Of around 1600 configurations, 44%
sit in an airline and type bucket holding more than one layout — LOT's 737 MAX 8 has three. A lookup therefore returns
a list and sets `ambiguous`; choosing between them needs per-airframe knowledge this service does not have.

## Build, test and deploy

This project uses [semantic versioning](https://semver.org/spec/v2.0.0.html).

Both routes ship as one package with one version. Bump it in every pull request:

```shell
docker compose exec app npm version 2.1.0 --no-git-tag-version
```

`integrity` fails the build if the version is already taken, and the release workflow tags it when `main` moves.

This project has configured continuous integration and continuous deployment pipelines. It uses GitHub Actions to
automatically build, test and deploy the app to AWS. You can find the configuration in `.github/workflows` directory.

The infrastructure is an OpenTofu stack in `infra/`: the Lambda function, its Function URL, its role, a log group and
the generated secret. `./zip.sh` builds the `export` stage of the `Dockerfile` into `dist.zip`, which holds the single
bundled `lambda.js`. A pull request gets a plan from `dflook/tofu-plan`; a merge to `main` tags the version and applies
the stack with `dflook/tofu-apply` in the `production` environment. The stack exports the Function URL and the secret
at the SSM parameters `/mypreflight/aerolopa-provider/url` and `/mypreflight/aerolopa-provider/secret`, where the API
reads them. Logs go to CloudWatch under `/aws/lambda/aerolopa-provider`.

Everything runs in Docker, in the `app` service:

```shell
docker compose exec app npm test
docker compose exec app npm run test:functional
docker compose exec app npm run typecheck
docker compose exec app npm run lint
docker compose exec app npm run bundle
```

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
[banner]: .github/image/banner.png
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
[biome-badge]: https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=white
[biome-url]: https://biomejs.dev
[cucumber-badge]: https://img.shields.io/badge/Cucumber-23D96C?style=for-the-badge&logo=cucumber&logoColor=white
[cucumber-url]: https://cucumber.io
