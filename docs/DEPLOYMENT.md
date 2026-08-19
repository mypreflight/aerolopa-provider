# Deployment

The seat map lookup is a **functions component of the `mypreflight` App Platform app**, not a separate serverless
project. App Platform builds it straight from this repository using `project.yml`, so there is no image, no registry
and nothing for a workflow to push. It runs on demand and scales to zero.

`flight-tracker-api` owns the app spec; this repo only supplies the source.

## One-time setup

### 1. Generate the shared secret

```shell
openssl rand -hex 32
```

Functions cannot be placed on a private network — they support neither VPCs nor App Platform internal routing — so the
endpoint is reachable over the app's public ingress and this secret is what protects it. `project.yml` declares it as
`webSecure`, which makes the platform demand a matching `X-Require-Whisk-Auth` header.

### 2. Add the component

Merge both blocks from `.do/app.component.yaml` into the app spec — the `functions` entry and the `ingress` rule:

```shell
APP_ID=48acd29a-cbac-42dd-8104-39f475ebee22

doctl apps spec get "$APP_ID" > app.yaml
# merge the two blocks from .do/app.component.yaml into app.yaml
doctl apps update "$APP_ID" --spec app.yaml
```

Or in the control panel: open the `mypreflight` app, **Create** → **Create/Attach Component** → **Function**, point it
at `mypreflight/aerolopa-provider` on `main`, then set the route to `/aerolopa` and add the secret under the
component's environment variables.

Two things to get right:

- The ingress rule must sit **ahead** of the existing `/` rules. App Platform matches in order, and the catch-all
  rules for `api.mypreflight.io` and `adsb.mypreflight.io` would otherwise swallow the path.
- App Platform requires environment variables for a functions component to appear **both** in the component's `envs`
  and in `project.yml`. They are in both here; keep them in step.

### 3. Point the backend at it

After the first deploy, read the real URL from the component — the path is composed from the ingress route plus the
package and function names, so confirm it rather than assuming:

```shell
doctl apps get 48acd29a-cbac-42dd-8104-39f475ebee22 --format DefaultIngress
```

The endpoint is that host plus `/aerolopa/aerolopa/seatmap` (route prefix, then package, then function). Verify with
the checks below before wiring it up, then add to the `flight-tracker-api` component under
**Settings** → the component → **Environment Variables**:

```
AEROLOPA_FUNCTION_URL=https://<app-host>/aerolopa/aerolopa/seatmap
AEROLOPA_FUNCTION_SECRET=<the secret>     # type SECRET
```

Saving redeploys the app, which is when the backend picks them up.

### 4. Verify

```shell
curl -s -o /dev/null -w '%{http_code}\n' "$URL?slug=lh-32n"
curl -s -H "X-Require-Whisk-Auth: $SECRET" "$URL?slug=lh-32n" | head -c 200
```

The first must return **401**. If it returns 200, `webSecure` is not being enforced on the ingress path and the
endpoint is open to anyone — stop and fix that before pointing the backend at it. The second returns a seat map.

## Routine releases

`deploy_on_push: true` means App Platform rebuilds the component whenever `main` moves. The workflow in this repo only
tags the version and drafts the GitHub release; it does not deploy.

## How the deployable is produced

All code lives in `packages/aerolopa/seatmap/src`. That path is not decoration: DigitalOcean Functions derives the
action name from the package and function directories (`aerolopa/seatmap`), and the remote builder copies that single
directory into an isolated workspace before running `build.sh`. Nothing above it exists at build time, which is why the
package carries its own `tsconfig.json`, `package.json` and build script.

`build.sh` runs `npm install --omit=dev` then `tsc`; `.include` ships `lib` and `package.json`. Only `typescript` and
`@types/node` are declared as dependencies of the function package, so the platform build installs three packages and
skips Jest entirely. No compiled output is committed — `packages/**/lib/` is git-ignored.

CI reproduces the platform exactly: it copies the function directory to an empty path, deletes `lib` and
`node_modules`, runs `build.sh` there and asserts `lib/function.js` exists. A change that only builds inside the full
repository fails that step rather than failing a deploy.

## Local development

```shell
docker compose up -d --build
curl "http://localhost:3001/seatmap?slug=lh-32n"
```

`docker compose` runs `scripts/dev-server.ts`, a throwaway HTTP wrapper around `main()` that is never deployed, and an
`aerolopa-mock` container standing in for AeroLOPA. To exercise the built artifact the way DigitalOcean will:

```shell
docker compose exec app npm run build
docker compose exec app node -e "require('./packages/aerolopa/seatmap/lib/function.js').main({slug:'lh-32n'}).then(r => console.log(r.statusCode))"
```

`AEROLOPA_API_HOST` points at the `aerolopa-mock` container locally, so neither the tests nor the dev server ever reach
the real site.

## Changing the response contract

The OpenAPI document is the contract, and `flight-tracker-api` generates its types from it.

1. Edit `openapi.json` here — it documents the single `GET /aerolopa/seatmap` operation.
2. Copy it into the backend at `src/core/provider/aerolopa/aerolopa.openapi.json`.
3. Run `npm run aerolopa:types` there and commit the regenerated types.

The backend's `integrity` workflow regenerates and fails on a diff, so a contract change that skips step 3 is caught
in CI rather than at runtime.
