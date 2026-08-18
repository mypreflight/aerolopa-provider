import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { openapiDocument } from "../src/http/openapi.document";

const target = join(__dirname, "..", "openapi.json");

writeFileSync(target, `${JSON.stringify(openapiDocument, null, 2)}\n`, "utf-8");

console.log(`wrote ${target}`);
