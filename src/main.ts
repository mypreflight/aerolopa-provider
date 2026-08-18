import { AerolopaClient } from "./aerolopa/aerolopa.client";
import { TtlCache } from "./core/cache/ttl-cache";
import { createHttpServer } from "./http/server";

const DEFAULT_PORT = 3000;

const DEFAULT_BASE_URL = "https://www.aerolopa.com";

const DEFAULT_USER_AGENT = "MyPreflight/1.0 (+https://mypreflight.io)";

export function bootstrap(): void {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const client = new AerolopaClient({
    baseUrl: process.env.AEROLOPA_API_HOST ?? DEFAULT_BASE_URL,
    userAgent: process.env.AEROLOPA_USER_AGENT ?? DEFAULT_USER_AGENT,
    cache: new TtlCache(),
  });

  createHttpServer(client).listen(port, () => {
    console.log(`aerolopa-provider listening on :${port}`);
  });
}

if (require.main === module) {
  bootstrap();
}
