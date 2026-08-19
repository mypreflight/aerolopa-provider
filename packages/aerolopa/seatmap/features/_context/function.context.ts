import { Then, When } from "@cucumber/cucumber";
import expect from "expect";
import { main } from "../../src/function";
import { deepCompare } from "../_helper/deep-compare";

let statusCode: number;
let body: unknown;

When("I invoke the function with {string}", async (query: string) => {
  const args = Object.fromEntries(new URLSearchParams(query));
  const result = await main(args);

  statusCode = result.statusCode;
  body = result.body;
});

When("I invoke the function with no arguments", async () => {
  const result = await main({});

  statusCode = result.statusCode;
  body = result.body;
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
