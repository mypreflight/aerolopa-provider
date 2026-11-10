import { Then, When } from "@cucumber/cucumber";
import expect from "expect";
import { handler } from "../../src/lambda";
import { deepCompare } from "../_helper/deep-compare";

let statusCode: number;
let body: unknown;

async function invoke(target: string, headers: Record<string, string>): Promise<void> {
  const url = new URL(target, "http://localhost");
  const query = Object.fromEntries(url.searchParams);

  const result = await handler({
    rawPath: url.pathname,
    headers,
    queryStringParameters: Object.keys(query).length > 0 ? query : undefined,
    requestContext: { http: { method: "GET" } },
  });

  statusCode = result.statusCode;
  body = JSON.parse(result.body);
}

When("I request {string}", async (target: string) => {
  await invoke(target, { authorization: `Bearer ${process.env.AEROLOPA_FUNCTION_SECRET ?? ""}` });
});

When("I request {string} without the secret", async (target: string) => {
  await invoke(target, {});
});

Then("the response status should be {int}", (expected: number) => {
  expect(statusCode).toBe(expected);
});

Then("the response body should contain:", (docString: string) => {
  deepCompare(body, JSON.parse(docString));
});

Then("the response body should have the property {string}", (property: string) => {
  expect(body).toHaveProperty(property);
});

Then("I dump response", () => {
  console.log(JSON.stringify(body, null, 2));
});
