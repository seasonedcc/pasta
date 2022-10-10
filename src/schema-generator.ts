import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";

async function generateSchema(sql: postgres.Sql<{}>) {
  const tables = await sql`
WITH relations AS (
  SELECT
    c.oid,
    n.nspname as schema,
    c.relname as name,
    c.oid || array_agg(pa) filter (WHERE pa IS NOT NULL) AS oids
  FROM
    pg_catalog.pg_class c
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_partition_ancestors(c.oid) pa on true
  WHERE
    c.relkind IN ('r','p','','v','m','f')
    AND n.nspname <> 'pg_catalog'
    AND n.nspname <> 'information_schema'
    AND n.nspname !~ '^pg_toast'
    AND pg_catalog.pg_table_is_visible(c.oid)
  GROUP BY c.oid, n.nspname, c.relname
  ORDER BY
    n.nspname, c.relname
),

columns AS (
  SELECT
    a.attnum,
    a.attname as name,
    CASE a.atttypid
      WHEN 1082 THEN 'string | TimestampFunctionCall'
      WHEN 1114 THEN 'string | TimestampFunctionCall'
      WHEN 3802 THEN 'JSONValue'
      WHEN 114 THEN 'JSONValue'
      WHEN 16 THEN 'boolean'
      WHEN 20 THEN 'bigint'
      WHEN 701 THEN 'number'
      WHEN 23 THEN 'number'
      ELSE 'string'
    END as column_ts_type,
    a.atthasdef OR NOT a.attnotnull as optional,
    (SELECT c.collname FROM pg_catalog.pg_collation c, pg_catalog.pg_type t
      WHERE c.oid = a.attcollation AND t.oid = a.atttypid AND a.attcollation <> t.typcollation) AS attcollation,
    a.attidentity,
    a.attgenerated,
    a.attrelid
  FROM pg_catalog.pg_attribute a
  WHERE a.attnum > 0 AND NOT a.attisdropped
),

direct_associations AS (
  SELECT
    rr.oid,
    main.oid as table_oid,
    rr.relname as referenced_relation,
    '1xN' as kind,
    main.relname as table,
    jsonb_agg(json_build_array(fk.attname, pk.attname) ORDER BY fk.attname) as fks
  FROM
    pg_catalog.pg_constraint c
    JOIN pg_class rr on c.confrelid = rr.oid
    JOIN pg_catalog.pg_attribute pk on pk.attrelid = c.confrelid and pk.attnum = any(c.confkey)
    JOIN pg_class main on main.oid = c.conrelid
    JOIN pg_catalog.pg_attribute fk on fk.attrelid = c.conrelid and fk.attnum = any(c.conkey)
  WHERE
    c.contype = 'f' AND c.conparentid = 0
  GROUP BY main.oid, rr.oid, rr.relname, main.relname
  UNION ALL
  SELECT
    rr.oid,
    main.oid as table_oid,
    rr.relname as referenced_relation,
    '1xN' as kind,
    main.relname as table,
    jsonb_agg(json_build_array(fk.attname, pk.attname) ORDER BY fk.attname) as fks
  FROM
    pg_catalog.pg_constraint c
    JOIN pg_class rr on c.conrelid = rr.oid
    JOIN pg_catalog.pg_attribute pk on pk.attrelid = c.conrelid and pk.attnum = any(c.conkey)
    JOIN pg_class main on main.oid = c.confrelid
    JOIN pg_catalog.pg_attribute fk on fk.attrelid = c.confrelid and fk.attnum = any(c.confkey)
  WHERE
    c.contype = 'f' AND c.conparentid = 0
  GROUP BY main.oid, rr.oid, rr.relname, main.relname
),

indirect_associations AS (
  SELECT
    d1.table_oid as oid,
    d1.table as referenced_relation,
    d2.table as table,
    'MxN' as kind,
    d1.referenced_relation as associative_table,
    d1.fks as fks_referenced,
    d2.fks as fks_table
  FROM
    direct_associations d1
    JOIN direct_associations d2 ON d1.referenced_relation = d2.referenced_relation AND d1.table <> d2.table
  WHERE
    d1.referenced_relation IN (
      SELECT d3.referenced_relation FROM direct_associations d3 GROUP BY d3.referenced_relation HAVING count(*) > 1
    )
)

SELECT
  r.schema,
  r.name,
  json_agg(row_to_json(c.*) ORDER BY c.attnum) as columns,
  (SELECT json_agg(row_to_json(a.*) ORDER BY a.table) FROM direct_associations a WHERE a.oid = r.oid) as direct_associations,
  (SELECT json_agg(row_to_json(i.*) ORDER BY i.table) FROM indirect_associations i WHERE i.oid = r.oid) as indirect_associations
FROM
  relations r
  JOIN columns c ON c.attrelid = r.oid
GROUP BY r.oid, r.schema, r.name
ORDER BY r.schema, r.name`;

  const tableTypes = tables.map((el) =>
    `${el.name}: {
    columns: {
      ${
      el.columns.map((
        c: {
          name: string;
          column_ts_type: string;
          optional: boolean;
        },
      ) => `${c.name}${c.optional ? "?" : ""}: ${c.column_ts_type}`)
        .join(";\n      ")
    }
    }
  }`
  ).join(
    ",\n  ",
  );

  const associations = tables.map((el) => {
    const directAssociations = (el.direct_associations ?? []).map((
      a: { table: string; kind: string; fks: [string, string][] },
    ) =>
      `${a.table}: {
      kind: "${a.kind}",
      table: "${a.table}",
      fks: { ${a.fks.map((fk) => `${fk[0]}: "${fk[1]}"`)} }
    }`
    ).join(",\n    ");

    const indirectAssociations = (el.indirect_associations ?? []).map((
      a: {
        table: string;
        kind: string;
        associative_table: string;
        referenced_relation: string;
        fks_referenced: [string, string][];
        fks_table: [string, string][];
      },
    ) => {
      const fks_referenced = a.fks_referenced.reduce((prev, curr) => {
        prev[curr[1]] = [a.referenced_relation, curr[0]];
        return prev;
      }, {} as Record<string, [string, string]>);
      const fks_table = a.fks_table.reduce((prev, curr) => {
        prev[curr[1]] = [a.table, curr[0]];
        return prev;
      }, {} as Record<string, [string, string]>);

      return `${a.table}: {
      kind: "${a.kind}",
      associativeTable: "${a.associative_table}",
      table: "${a.table}",
      fks: ${JSON.stringify({ ...fks_referenced, ...fks_table })}
    }`;
    }).join(",\n    ");

    return `${el.name}: {
    ${
      [directAssociations, indirectAssociations].filter((e) => e.length > 0)
        .join(",\n    ")
    }
  }`;
  }).join(
    ",\n  ",
  );

  return `import { JSONValue, TimestampFunctionCall } from "./pg-catalog.ts";
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

const associations: Associations = {
  ${associations}
};

export type { TableName, Tables };
export { associations };
`;
}

export { generateSchema };
