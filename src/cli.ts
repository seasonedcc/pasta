import { parse } from "https://deno.land/std@0.148.0/flags/mod.ts";
import {
  generateCustomSchema,
  generatePgCatalog,
  generateSchema,
} from "./schema-generator.ts";
import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";

const { "_": connectionUrl } = parse(Deno.args);

const sql = postgres(`${connectionUrl}`);

const path = "./database";
await Deno.mkdir(path, { recursive: true });
await Promise.all([
  Deno.writeTextFile(
    `${path}/custom-schema.ts`,
    await generateCustomSchema(sql),
  ),
  Deno.writeTextFile(
    `${path}/pg-catalog.ts`,
    generatePgCatalog(),
  ),
  Deno.writeTextFile(
    `${path}/schema.ts`,
    generateSchema(),
  ),
]);

await sql.end();
