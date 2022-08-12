import { parse } from "https://deno.land/std@0.148.0/flags/mod.ts";
import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";

const { "_": connectionUrl } = parse(Deno.args);

const sql = postgres(`${connectionUrl}`);

const [{ current_database, version }] = await sql
  `select current_database(), version()`;

console.info(`Connected to ${current_database}@${version}`);

await sql.end();
console.info("Done ✅");
