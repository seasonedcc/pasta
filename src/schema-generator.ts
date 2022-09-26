import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";

async function generateSchema(connectionUrl: string) {
  const sql = postgres(`${connectionUrl}`);

  const [{ current_database, version }] =
    await sql`select current_database(), version()`;

  console.info(`Connected to ${current_database}@${version}`);

  const tables = await sql`
WITH relations AS (
  SELECT
    c.oid,
    n.nspname as schema,
    c.relname as name
  FROM
    pg_catalog.pg_class c
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE
    c.relkind IN ('r','p','','v','m','f')
    AND n.nspname <> 'pg_catalog'
    AND n.nspname <> 'information_schema'
    AND n.nspname !~ '^pg_toast'
    AND pg_catalog.pg_table_is_visible(c.oid)
),

columns AS (
  SELECT
    a.attname as name,
    CASE a.atttypid
      -- WHEN 1082 THEN 'Date'
      -- WHEN 1114 THEN 'Date'
      WHEN 3802 THEN 'JSONValue'
      WHEN 114 THEN 'JSONValue'
      WHEN 16 THEN 'boolean'
      WHEN 20 THEN 'bigint'
      WHEN 701 THEN 'number'
      WHEN 23 THEN 'number'
      ELSE 'string'
    END as column_ts_type,
    (SELECT pg_catalog.pg_get_expr(d.adbin, d.adrelid, true)
      FROM pg_catalog.pg_attrdef d
      WHERE d.adrelid = a.attrelid AND d.adnum = a.attnum AND a.atthasdef),
    a.attnotnull as notnull,
    (SELECT c.collname FROM pg_catalog.pg_collation c, pg_catalog.pg_type t
      WHERE c.oid = a.attcollation AND t.oid = a.atttypid AND a.attcollation <> t.typcollation) AS attcollation,
    a.attidentity,
    a.attgenerated,
    a.attrelid
  FROM pg_catalog.pg_attribute a
  WHERE a.attnum > 0 AND NOT a.attisdropped
)

SELECT r.schema, r.name, json_agg(row_to_json(c.*)) as columns
FROM relations r JOIN columns c ON c.attrelid = r.oid
GROUP BY r.schema, r.name;`;

  const tableTypes = tables.map((el) =>
    `${el.name}: {
    columns: {
      ${
      el.columns.map((
        c: {
          name: string;
          column_ts_type: string;
          notnull: boolean;
        },
      ) => `${c.name}${c.notnull ? "" : "?"}: ${c.column_ts_type}`)
        .join(";\n      ")
    }
    }
  }`
  ).join(
    ",\n  ",
  );

  console.log(
    `import { JSONValue, TimestampFunctionCall } from "./pg-catalog.ts";
type Tables = {
  ${tableTypes}
}
type TableName = keyof Tables;
type Association =
| { kind: "1xN"; table: TableName; fks: Record<string, string> }
| {
  kind: "MxN";
  table: TableName;
  associativeTable: TableName;
  fks: Record<string, [string, string]>;
};
type Associations = Record<TableName, null | Record<string, Association>>;
export type { TableName, Tables };
`,
  );

  await sql.end();
  console.info("Done ✅");
}

export { generateSchema };
