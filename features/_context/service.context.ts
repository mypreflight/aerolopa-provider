import { AfterAll, Then, When } from "@cucumber/cucumber";
import expect from "expect";
import { deepCompare } from "../_helper/deep-compare";
import { serviceUrl, stopService } from "../_helper/environment";

let response: Response;
let body: unknown;

When("I send a {string} request to {string}", async (method: string, path: string) => {
  response = await fetch(`${serviceUrl}${path}`, { method });

  const text = await response.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
});

Then("the response status should be {int}", (status: number) => {
  expect(response.status).toBe(status);
});

Then("the response header {string} should be {string}", (header: string, value: string) => {
  expect(response.headers.get(header)).toBe(value);
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

AfterAll(async () => {
  await stopService();
});
