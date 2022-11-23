import { parse } from "https://deno.land/std@0.148.0/flags/mod.ts";
import { extractBuilders, extractSchema } from "./schema-extractor.ts";
import {
  generateIndex,
  generatePgCatalog,
  generateSchema,
  generateTypedStatementBuilder,
} from "./static-modules-generator.ts";
import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";
import pkg from '../deno.json' assert { type: 'json' }

const { "_": connectionUrl, node } = parse(Deno.args, { boolean: ["node"] });

const replaceStringsForNode = (content: string) =>
  node
    ? content.replaceAll("https://deno.land/x/postgresjs@v3.2.4/mod.js", "postgres").replaceAll(
      `Deno.env.get("DATABASE_URL")`,
      `process.env["DATABASE_URL"]`,
    )
    : content;

const pastaLib = node ? "pasta" : `https://deno.land/x/pasta@${pkg.version}/mod.ts`;

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
    `${path}/typed-statement-builder.ts`,
    generateTypedStatementBuilder(pastaLib),
  ],
  [
    `${path}/index.ts`,
    generateIndex(pastaLib),
  ],
  [
    `${path}/builders.ts`,
    await extractBuilders(sql),
  ],
].map(([path, content]) => Deno.writeTextFile(path, replaceStringsForNode(content))));

await sql.end();
