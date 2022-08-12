import { parse } from "https://deno.land/std@0.148.0/flags/mod.ts";
import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";

const { "_": connectionUrl } = parse(Deno.args);

const sql = postgres(`${connectionUrl}`);

const [{ current_database, version }] = await sql
  `select current_database(), version()`;

console.info(`Connected to ${current_database}@${version}`);

const tables = await sql`
WITH relations AS (
  SELECT 
  c.oid,
  n.nspname as schema,
  c.relname as name
FROM pg_catalog.pg_class c
     LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','p','','v','m','f')
      AND n.nspname <> 'pg_catalog'
      AND n.nspname <> 'information_schema'
      AND n.nspname !~ '^pg_toast'
  AND pg_catalog.pg_table_is_visible(c.oid)
),
columns AS (
  SELECT a.attname,
  pg_catalog.format_type(a.atttypid, a.atttypmod),
  (SELECT pg_catalog.pg_get_expr(d.adbin, d.adrelid, true)
   FROM pg_catalog.pg_attrdef d
   WHERE d.adrelid = a.attrelid AND d.adnum = a.attnum AND a.atthasdef),
  a.attnotnull,
  (SELECT c.collname FROM pg_catalog.pg_collation c, pg_catalog.pg_type t
   WHERE c.oid = a.attcollation AND t.oid = a.atttypid AND a.attcollation <> t.typcollation) AS attcollation,
  a.attidentity,
  a.attgenerated,
  a.attrelid
FROM pg_catalog.pg_attribute a
WHERE a.attnum > 0 AND NOT a.attisdropped
)
SELECT * FROM relations r JOIN columns c ON c.attrelid = r.oid;`;

console.log(JSON.stringify(tables));

await sql.end();
console.info("Done ✅");
