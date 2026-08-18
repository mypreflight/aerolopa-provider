import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

type Route = {
  status: number;
  body: string;
  contentType?: string;
};

export class UpstreamStub {
  private server: Server | undefined;
  private routes = new Map<string, Route>();
  private calls: string[] = [];

  async start(): Promise<void> {
    this.server = createServer((request, response) => {
      const path = (request.url ?? "/").split("?")[0];
      this.calls.push(path);

      const route = this.routes.get(path);

      if (!route) {
        response.writeHead(404, { "Content-Type": "text/html" });
        response.end("<html>not found</html>");
        return;
      }

      response.writeHead(route.status, {
        "Content-Type": route.contentType ?? "text/x-component",
      });
      response.end(route.body);
    });

    await new Promise<void>((resolve) => this.server?.listen(0, resolve));
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
    });
    this.server = undefined;
  }

  reset(): void {
    this.routes.clear();
    this.calls = [];
  }

  get url(): string {
    const address = this.server?.address() as AddressInfo;
    return `http://127.0.0.1:${address.port}`;
  }

  serve(path: string, route: Route): void {
    this.routes.set(path, route);
  }

  callsTo(path: string): number {
    return this.calls.filter((call) => call === path).length;
  }
}
