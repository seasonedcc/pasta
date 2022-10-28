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
  [
    `${path}/custom-schema.ts`,
    await extractSchema(sql),
  ],
  [
    `${path}/pg-catalog.ts`,
    generatePgCatalog(),
  ],
  [
    `${path}/schema.ts`,
    generateSchema(),
  ],
  [
    `${path}/statement-builder.ts`,
    generateStatementBuilder(),
  ],
  [
    `${path}/transaction.ts`,
    generateTransaction(),
  ],
  [
    `${path}/index.ts`,
    generateIndex(),
  ],
  [
    `${path}/builders.ts`,
    await extractBuilders(sql),
  ],
].map(([path, content]) => Deno.writeTextFile(path, content)));

await sql.end();
