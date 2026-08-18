# Deployment

The service runs as an internal component of the existing `mypreflight` App Platform app. It has no public URL, so
there is no domain, certificate or API key to configure — only a component to add once and an environment variable on
the backend.

`flight-tracker-api` owns the app spec. This repo only pushes images and asks the app to redeploy.

## One-time setup

### 1. Push the repository

Create `oskarbarcz/mypreflight-aerolopa-provider` on GitHub and push `main`. The `release` workflow tags the version,
builds the production image and pushes it to `ghcr.io/oskarbarcz/mypreflight-aerolopa-provider` as `:1.0.0` and
`:latest`.

Do this **before** step 3 — App Platform cannot deploy a component whose image does not exist yet.

### 2. Configure the repository

| Where                    | Name                        | Value                                                                   |
| ------------------------ | --------------------------- | ----------------------------------------------------------------------- |
| Environment `production` | `DIGITALOCEAN_ACCESS_TOKEN` | a DigitalOcean personal access token with write scope                   |
| Environment `image`      | —                           | no secrets; the job uses the built-in `GITHUB_TOKEN` to push to ghcr.io |

If the ghcr package is private, App Platform needs a registry credential to pull it — the same one
`flight-tracker-api` already uses for its own image. Making the package public is the simpler option for a
public-domain project.

### 3. Add the component to the app spec

```shell
APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | awk '$2 == "mypreflight" { print $1 }')

doctl apps spec get "$APP_ID" > app.yaml
# merge the services entry from .do/app.component.yaml into app.yaml
doctl apps update "$APP_ID" --spec app.yaml
```

The component declares `internal_ports: [3000]` and no `http_port`, which is what keeps it off the public ingress.

### 4. Point the backend at it

Add to the `flight-tracker-api` component's environment:

```
AEROLOPA_SERVICE_URL=http://aerolopa-provider:3000
```

Redeploy the app so the backend picks the variable up.

### 5. Verify

From the app's console, on the backend component:

```shell
curl -s http://aerolopa-provider:3000/health
curl -s "http://aerolopa-provider:3000/seatmap?slug=lh-32n" | head -c 200
```

The first answers `{"status":"ok"}`, the second a seat map. From outside the app there is no reachable address at all —
that is the point.

## Routine releases

Bump `version` in `package.json` and merge to `main`. The pipeline tags the release, pushes the image and calls
`doctl apps create-deployment`, which redeploys the stored spec — it never applies a spec of its own, so it cannot
disturb the backend component.

## Changing the response contract

The OpenAPI document is the contract, and `flight-tracker-api` generates its types from it.

1. Edit `src/http/openapi.document.ts` here, then `npm run openapi:emit`.
2. Copy `openapi.json` into the backend at `src/core/provider/aerolopa/aerolopa.openapi.json`.
3. Run `npm run aerolopa:types` there and commit the regenerated types.

The backend's `integrity` workflow regenerates and fails on a diff, so a contract change that skips step 3 is caught
in CI rather than at runtime.
