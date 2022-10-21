import { parse } from "https://deno.land/std@0.148.0/flags/mod.ts";
import { extractBuilders, extractSchema } from "./schema-extractor.ts";
import {
  generateIndex,
  generatePgCatalog,
  generateSchema,
  generateStatementBuilder,
  generateTransaction,
} from "./static-modules-generator.ts";
import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";

const { "_": connectionUrl } = parse(Deno.args);

const sql = postgres(`${connectionUrl}`);

const path = "./src/database";
await Deno.mkdir(path, { recursive: true });
await Promise.all([
  Deno.writeTextFile(
    `${path}/custom-schema.ts`,
    await extractSchema(sql),
  ),
  Deno.writeTextFile(
    `${path}/pg-catalog.ts`,
    generatePgCatalog(),
  ),
  Deno.writeTextFile(
    `${path}/schema.ts`,
    generateSchema(),
  ),
  Deno.writeTextFile(
    `${path}/statement-builder.ts`,
    generateStatementBuilder(),
  ),
  Deno.writeTextFile(
    `${path}/transaction.ts`,
    generateTransaction(),
  ),
  Deno.writeTextFile(
    `${path}/index.ts`,
    generateIndex(),
  ),
  Deno.writeTextFile(
    `${path}/builders.ts`,
    await extractBuilders(sql),
  ),
]);

await sql.end();
