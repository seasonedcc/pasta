import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";

type Connection = postgres.Sql<Record<never, never>>;

async function extractSchema(sql: Connection) {
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
    a.attrelid,
    a.attnotnull
  FROM pg_catalog.pg_attribute a
  WHERE a.attnum > 0 AND NOT a.attisdropped
),

fks AS (
  SELECT
    rr.oid,
    main.oid as table_oid,
    rr.relname as referenced_relation,
    main.relname as table,
    fk.attname as fk,
    pk.attname as pk
  FROM
    pg_catalog.pg_constraint c
    JOIN pg_class rr on c.confrelid = rr.oid
    JOIN pg_catalog.pg_attribute pk on pk.attrelid = c.confrelid and pk.attnum = any(c.confkey)
    JOIN pg_class main on main.oid = c.conrelid
    JOIN pg_catalog.pg_attribute fk on fk.attrelid = c.conrelid and fk.attnum = any(c.conkey)
  WHERE
    c.contype = 'f' AND c.conparentid = 0
  UNION ALL
  SELECT
    rr.oid,
    main.oid as table_oid,
    rr.relname as referenced_relation,
    main.relname as table,
    fk.attname as fk,
    pk.attname as pk
  FROM
    pg_catalog.pg_constraint c
    JOIN pg_class rr on c.conrelid = rr.oid
    JOIN pg_catalog.pg_attribute pk on pk.attrelid = c.conrelid and pk.attnum = any(c.conkey)
    JOIN pg_class main on main.oid = c.confrelid
    JOIN pg_catalog.pg_attribute fk on fk.attrelid = c.confrelid and fk.attnum = any(c.confkey)
  WHERE
    c.contype = 'f' AND c.conparentid = 0
),

direct_associations AS (
  SELECT
    fks.oid,
    fks.table_oid,
    fks.referenced_relation,
    '1xN' as kind,
    fks.table,
    jsonb_agg(json_build_array(fks.fk, fks.pk) ORDER BY fks.fk) as fks
  FROM
    fks
  GROUP BY fks.oid, fks.table_oid, fks.referenced_relation, fks.table
),

indirect_associations AS (
  SELECT
    d1.table_oid as oid,
    d1.table as referenced_relation,
    d2.table_oid as table_oid,
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
),

keys AS (
  SELECT
    c.oid,
    co.name,
    co.column_ts_type,
    i.indisprimary as is_primary,
    c2.relname as index_name
  FROM
    pg_catalog.pg_index i
    JOIN pg_catalog.pg_class c ON c.oid = i.indrelid -- main relation
    JOIN pg_catalog.pg_class c2 ON c2.oid = i.indexrelid -- index relation
    LEFT JOIN columns co ON co.attrelid = c2.oid
  WHERE
    i.indisunique
    --AND true = ALL(SELECT co2.attnotnull FROM columns co2 WHERE co2.attrelid = c.oid)
),

associations AS (
  SELECT
    da.oid,
    da.table_oid,
    da.table
  FROM direct_associations da
  GROUP BY da.oid, da.table_oid, da.table
  UNION
  SELECT
    ia.oid,
    ia.table_oid,
    ia.table
  FROM indirect_associations ia
  GROUP BY ia.oid, ia.table_oid, ia.table
),

association_columns AS (
  SELECT DISTINCT
    a.oid,
    a.table_oid,
    a.table,
    c.attnum,
    c.name,
    c.column_ts_type
  FROM
    associations a
    JOIN columns c ON c.attrelid = a.table_oid
  WHERE
    NOT c.optional
    AND NOT EXISTS (SELECT FROM fks k WHERE k.oid = a.oid AND k.table_oid = a.table_oid AND k.fk = c.name)
)

SELECT
  r.schema,
  r.name,
  jsonb_agg(row_to_json(c.*) ORDER BY c.attnum) as columns,
  (SELECT jsonb_agg(row_to_json(a.*) ORDER BY a.table) FROM direct_associations a WHERE a.oid = r.oid) as direct_associations,
  (SELECT jsonb_agg(row_to_json(i.*) ORDER BY i.table) FROM indirect_associations i WHERE i.oid = r.oid) as indirect_associations,
  (SELECT jsonb_agg(row_to_json(k.*) ORDER BY k.is_primary DESC, k.index_name) FROM keys k WHERE k.oid = r.oid) as keys,
  (SELECT jsonb_agg(row_to_json(ac.*) ORDER BY ac.table, ac.attnum) FROM association_columns ac WHERE ac.oid = r.oid) as association_columns
FROM
  relations r
  JOIN columns c ON c.attrelid = r.oid
GROUP BY r.oid, r.schema, r.name
ORDER BY r.schema, r.name`;

  const tableTypes = tables.map((el) => {
    const keySets = el.keys.reduce(
      (
        prev: Record<string, { index_name: string }[]>,
        curr: { index_name: string },
      ) => {
        if (Object.keys(prev).includes(curr.index_name)) {
          prev[curr.index_name].push(curr);
        } else {
          prev[curr.index_name] = [curr];
        }
        return prev;
      },
      {},
    );
    const keys = Object.values(keySets).map(
      (keys) => {
        return (keys as { name: string; column_ts_type: string }[]).map((
          k: { name: string; column_ts_type: string },
        ) => `${k.name}: ${k.column_ts_type};`).join("\n      ");
      },
    );

    const associatonColumnsSets = el.association_columns.reduce(
      (
        prev: Record<string, { table: string }[]>,
        curr: { table: string },
      ) => {
        if (Object.keys(prev).includes(curr.table)) {
          prev[curr.table].push(curr);
        } else {
          prev[curr.table] = [curr];
        }
        return prev;
      },
      {},
    );

    const associationColumns = Object.keys(associatonColumnsSets).map((
      k: string,
    ) => {
      const columns = associatonColumnsSets[k] as {
        name: string;
        column_ts_type: string;
      }[];
      const columnsType = columns.map((c) => `${c.name}: ${c.column_ts_type}`)
        .join("; ");
      return `{ ${k}: { ${columnsType} } }`;
    }).join("\n      | ");

    return `${el.name}: {
    keys: {
      ${keys.join("\n    } | {\n      ")}
    };
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
    };
    associations:
      | ${associationColumns};
  }`;
  }).join(
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

async function extractBuilders(sql: Connection) {
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
) SELECT * FROM relations
  `;

  const tableNames = tables.map((t) => t.name as string);
  const builderDefinitions = tableNames.map((t) => (`
const ${t}: TableBuilder<"${t}"> = {
  select: select("${t}")(),
  insert: insert("${t}"),
  where: select("${t}")().where,
  unique: select("${t}")().unique,
};`)).join("\n");

  return `
import { ColumnsOf, KeysOf, TableName } from "./schema.ts";
import {
  insert,
  InsertBuilder,
  select,
  SelectBuilder,
} from "./statement-builder.ts";

type TableBuilder<T extends TableName> = {
  select: SelectBuilder<T>;
  insert: (values: ColumnsOf<T>) => InsertBuilder<T>;
  where: (values: ColumnsOf<T>) => SelectBuilder<T>;
  unique: (values: KeysOf<T>) => SelectBuilder<T>;
};

${builderDefinitions}

const tables = { ${tableNames.join(", ")} };

export { tables };
`;
}
export { extractBuilders, extractSchema };
