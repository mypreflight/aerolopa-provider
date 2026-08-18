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

If the ghcr package is private, add `registry_credentials` to the component, as the `flight-tracker-api` component
already does. The `adsb-receiver-api` component carries none, so publishing the package is the simpler route.

### 3. Add the component

It is a **service**, not a job and not a function. Jobs are not routable — they run to completion and exit, so nothing
can call them. Functions are public HTTPS only. A service with internal ports and no public port is the only component
type that answers requests from inside the app and nowhere else.

#### From the control panel

The control panel can do all of it, though the last step happens in the spec editor rather than a form.

1. Open the `mypreflight` app, then **Create** → **Create/Attach Component** → **Service**.
2. Choose the **Container image** tab and pick **GitHub Container Registry**.
   - repository: `oskarbarcz/mypreflight-aerolopa-provider`
   - tag: `1.0.0`
   - credentials, if the package is private: `<github-username>:<personal-access-token>` with `read:packages`
3. On the resource screen keep the smallest instance size and a single instance.
4. Under **Environment Variables** add `PORT=3000`, `AEROLOPA_API_HOST=https://www.aerolopa.com` and
   `AEROLOPA_USER_AGENT=MyPreflight/1.0 (+https://mypreflight.io)`, all at run time.
5. Set the **HTTP Port** to `3000` and the health check path to `/health`.
6. Open **Settings** → the `aerolopa-provider` component → **Ports** → **Edit**, tick
   *Add internal ports for private networking* and enter `3000`.
7. Open **Settings** → **App Spec** → **Edit**. On the `aerolopa-provider` service delete the `http_port` line, and
   delete the component's entry from the top-level `ingress.rules` list. Save.

Step 7 cannot be done from the forms: the control panel exposes adding internal ports, but not removing the public
port and route. Until it is done the service is still answering on the app's public ingress.

Afterwards the component should read like `.do/app.component.yaml` — `internal_ports` present, no `http_port`, and no
`ingress` rule naming it.

#### Or paste the component directly

**Settings** → **App Spec** → **Edit** and add this under the existing `services:` list — it skips every form and is
the same end state:

```yaml
  - name: aerolopa-provider
    image:
      registry_type: GHCR
      registry: oskarbarcz
      repository: mypreflight-aerolopa-provider
      tag: 1.0.0
    instance_size_slug: apps-s-1vcpu-0.5gb
    instance_count: 1
    internal_ports:
      - 3000
    health_check:
      http_path: /health
      port: 3000
    envs:
      - key: PORT
        scope: RUN_TIME
        value: '3000'
      - key: AEROLOPA_API_HOST
        scope: RUN_TIME
        value: 'https://www.aerolopa.com'
      - key: AEROLOPA_USER_AGENT
        scope: RUN_TIME
        value: 'MyPreflight/1.0 (+https://mypreflight.io)'
```

#### Or from the command line

```shell
APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | awk '$2 == "mypreflight" { print $1 }')

doctl apps spec get "$APP_ID" > app.yaml
# merge the services entry from .do/app.component.yaml into app.yaml
doctl apps update "$APP_ID" --spec app.yaml
```

Keep the component name exactly `aerolopa-provider`. The release pipeline walks the app's components and, for each,
looks up `IMAGE_TAG_<NAME>` with the name uppercased and dashes turned into underscores. The lookup runs in that
direction, so a component named anything else simply never matches `IMAGE_TAG_AEROLOPA_PROVIDER` — the deployment
still succeeds, and it silently ships the previously deployed image.

### 4. Point the backend at it

In the control panel, open **Settings** → the `flight-tracker-api` component → **Environment Variables** → **Edit**,
and add:

```
AEROLOPA_SERVICE_URL=http://aerolopa-provider:3000
```

Saving redeploys the app, which is when the backend picks the variable up. The hostname is the component name — App
Platform resolves it on the app's private network.

### 5. Verify

From the app's console, on the backend component:

```shell
curl -s http://aerolopa-provider:3000/health
curl -s "http://aerolopa-provider:3000/seatmap?slug=lh-32n" | head -c 200
```

The first answers `{"status":"ok"}`, the second a seat map. From outside the app there is no reachable address at all —
that is the point.

## Routine releases

Bump `version` in `package.json` and merge to `main`. The pipeline tags the release, pushes the image and deploys the
`mypreflight` app with `digitalocean/app_action`, exporting `IMAGE_TAG_AEROLOPA_PROVIDER` first.

That variable is the whole mechanism: with the backwards-compatible `app_name` input, the action rewrites the `tag`
field of the component whose name matches the variable suffix (`aerolopa-provider` uppercased, dashes to
underscores). Components with no matching variable keep the tag already in the live spec, which is why this repo and
`flight-tracker-api` can both deploy the same app without treading on each other.

## Changing the response contract

The OpenAPI document is the contract, and `flight-tracker-api` generates its types from it.

1. Edit `src/http/openapi.document.ts` here, then `npm run openapi:emit`.
2. Copy `openapi.json` into the backend at `src/core/provider/aerolopa/aerolopa.openapi.json`.
3. Run `npm run aerolopa:types` there and commit the regenerated types.

The backend's `integrity` workflow regenerates and fails on a diff, so a contract change that skips step 3 is caught
in CI rather than at runtime.
