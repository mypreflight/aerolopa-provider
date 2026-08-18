# Deployment

The service is a DigitalOcean Function: it scales to zero, so it costs nothing while idle and starts on the first
request. Deployment is `doctl serverless deploy`; there is no image, no App Platform component and no app spec to
merge.

## One-time setup

### 1. Create a serverless namespace

In the control panel, go to **Functions** and create a namespace in `fra` (the same region as the `mypreflight` app).
The namespace is the only infrastructure this repo needs.

### 2. Generate the shared secret

```shell
openssl rand -hex 32
```

Functions have no private-network option — they support neither VPCs nor App Platform internal routing — so the
endpoint is public HTTPS and this secret is what protects it. App Platform rejects a request without a matching
`X-Require-Whisk-Auth` header before the function is ever invoked.

Store the value twice:

| Repository | Where | Name |
|---|---|---|
| this one | Environment `production` secret | `AEROLOPA_FUNCTION_SECRET` |
| `flight-tracker-api` | App Platform component env var, type `SECRET` | `AEROLOPA_FUNCTION_SECRET` |

Also add `DIGITALOCEAN_ACCESS_TOKEN` to this repository's `production` environment.

### 3. Deploy

Push `main`. The pipeline tags the release, writes the secret into `.env`, connects to the namespace and runs
`doctl serverless deploy . --remote-build`.

Only the secret is injected at deploy time. `project.yml` carries a single `${AEROLOPA_FUNCTION_SECRET}` placeholder
because the AeroLOPA host and user agent have defaults in `src/function.ts` — there is nothing else to configure.

To deploy by hand:

```shell
doctl serverless namespaces list
doctl serverless connect
cp .env.dist .env   # then set AEROLOPA_FUNCTION_SECRET
doctl serverless deploy . --remote-build
```

### 4. Point the backend at it

Read the URL back:

```shell
doctl serverless functions get aerolopa/seatmap --url
```

Add both variables to the `flight-tracker-api` component, in the control panel under
**Settings** → the component → **Environment Variables**:

```
AEROLOPA_FUNCTION_URL=https://faas-fra1-xxxx.doserverless.co/api/v1/web/<namespace>/aerolopa/seatmap
AEROLOPA_FUNCTION_SECRET=<the secret>     # type SECRET
```

Saving redeploys the app, which is when the backend picks them up.

### 5. Verify

```shell
curl -s -H "X-Require-Whisk-Auth: $SECRET" "$URL?slug=lh-32n" | head -c 200
curl -s -o /dev/null -w '%{http_code}\n' "$URL?slug=lh-32n"
```

The first returns a seat map. The second, with no auth header, must return `401` — if it returns `200`, `webSecure`
did not take effect and the endpoint is open.

## Routine releases

Bump `version` in `package.json` and merge to `main`.

## Local development

The function entry point is `src/function.ts`. Locally the same handler runs behind a plain HTTP server
(`src/main.ts`), which is what `docker compose up` starts and what the Cucumber suite drives:

```shell
docker compose up -d --build
curl "http://localhost:3001/seatmap?slug=lh-32n"
```

To exercise the deployable artifact instead:

```shell
docker compose exec app ./packages/aerolopa/seatmap/build.sh
docker compose exec app node -e "require('./packages/aerolopa/seatmap/lib/function.js').main({slug:'lh-32n'}).then(r => console.log(r.statusCode))"
```

## Changing the response contract

The OpenAPI document is the contract, and `flight-tracker-api` generates its types from it.

1. Edit `src/http/openapi.document.ts` here, then `npm run openapi:emit`.
2. Copy `openapi.json` into the backend at `src/core/provider/aerolopa/aerolopa.openapi.json`.
3. Run `npm run aerolopa:types` there and commit the regenerated types.

The backend's `integrity` workflow regenerates and fails on a diff, so a contract change that skips step 3 is caught
in CI rather than at runtime.
