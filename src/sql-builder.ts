import {
  astMapper,
  DeleteStatement,
  Expr,
  ExprRef,
  ExprString,
  From,
  InsertStatement,
  Name,
  OrderByStatement,
  QName,
  SelectedColumn,
  SelectStatement,
  Statement,
  toSql,
  UpdateStatement,
  WithStatement,
} from "https://deno.land/x/pgsql_ast_parser@11.0.0/mod.ts";

type SqlBuilder = {
  statement:
    | SelectStatement
    | InsertStatement
    | UpdateStatement
    | WithStatement
    | DeleteStatement;
  toSql: () => string;
};

function returning(builder: SqlBuilder, columns: string[]): SqlBuilder {
  const returningMapper = (columnNames: string[]) =>
    astMapper((_map) => ({
      with: (t) => {
        if (t.in.type === "insert") {
          return {
            ...t,
            in: {
              ...t.in,
              returning: columnNames.map((c) => ({
                expr: { type: "ref", name: c },
              })),
            },
          };
        }
      },
      insert: (t) => {
        if (t.insert) {
          return {
            ...t,
            returning: columnNames.map((c) => ({
              expr: { type: "ref", name: c },
            })),
          };
        }
      },
    }));
  const statementWithReturning = returningMapper(columns)
    .statement(
      builder.statement,
    ) as InsertStatement;
  return {
    statement: statementWithReturning,
    toSql: () => toSql.statement(statementWithReturning),
  };
}

const binaryOp = (op: string) => (left: Expr, right: Expr) =>
  (
    {
      "type": "binary",
      left,
      right,
      op,
    }
  ) as Expr;

function qualifiedName(table: string, schema?: string): QName {
  return { schema: schema ? escapeIdentifier(schema) : undefined, name: escapeIdentifier(table) };
}

function exprRef(name: string, table?: string, schema?: string): ExprRef {
  return {
    "type": "ref",
    name: escapeIdentifier(name),
    table: table ? qualifiedName(table, schema) : undefined,
  };
}

function stringExpr(value: string): ExprString {
  return { "type": "string", value: escapeLiteral(value) };
}

const eqList = (valuesMap: Record<string, unknown>) =>
  binaryOp("=")({
    type: "list",
    expressions: Object.keys(valuesMap).map((k) => exprRef(k)),
  }, {
    type: "list",
    expressions: Object.values(valuesMap).map((v) => stringExpr(String(v))),
  }) as Expr;

function makeUpdate(
  table: string,
  keyValues: Record<string, unknown>,
  setValues: Record<string, unknown>,
): SqlBuilder {
  const statement: Statement = {
    "type": "update",
    "table": qualifiedName(table),
    "sets": Object.keys(setValues).map((k) => ({
      "column": qualifiedName(k),
      "value": {
        "type": "string",
        "value": String(setValues[k]),
      },
    })),
    "where": eqList(keyValues),
  };
  return {
    statement,
    toSql: () => toSql.statement(statement),
  };
}

function makeDelete(
  table: string,
  keyValues: Record<string, unknown>,
): SqlBuilder {
  const statement: DeleteStatement = {
    "type": "delete",
    "from": qualifiedName(table),
    "where": eqList(keyValues),
  };
  return {
    statement,
    toSql: () => toSql.statement(statement),
  };
}

function where(builder: SqlBuilder, columns: Record<string, unknown>) {
  const whereMapper = (columns: Record<string, unknown>) =>
    astMapper((_map) => ({
      selection: (s) => ({
        ...s,
        where: eqList(columns),
      }),
    }));

  const statementWithWhere = whereMapper(columns)
    .statement(
      builder.statement,
    )! as SelectStatement;
  return {
    statement: statementWithWhere,
    toSql: () => toSql.statement(statementWithWhere),
  };
}

function makeSelect(table: string, schema?: string): SqlBuilder {
  const statement: Statement = {
    "columns": [],
    "from": [{ "type": "table", "name": qualifiedName(table, schema) }],
    "type": "select",
  };

  return {
    statement,
    toSql: () => toSql.statement(statement),
  };
}

function order(
  builder: SqlBuilder,
  columns: string[] | [string, 'ASC' | 'DESC'][],
  table?: string,
): SqlBuilder {
  const returningMapper = (columnNames: typeof columns) =>
    astMapper((_map) => ({
      selection: (s) => {
        const orderBy = columnNames.map((c) => table
            ? { by: exprRef(c[0]), order: c[1] }
            : c instanceof Array
              ? { by: exprRef(c[0]), order: c[1] }
              : { by: exprRef(c), order: 'ASC'}

        ) as OrderByStatement[]
        return ({
          ...s,
          orderBy
        });
      },
    }));

  const statementWithReturning = returningMapper(columns)
    .statement(
      builder.statement,
    )! as SelectStatement;
  return {
    statement: statementWithReturning,
    toSql: () => toSql.statement(statementWithReturning),
  };
}

function selection(
  builder: SqlBuilder,
  columns: string[] | [string, string][],
  table?: string,
): SqlBuilder {
  const returningMapper = (columnNames: typeof columns) =>
    astMapper((_map) => ({
      selection: (s) => ({
        ...s,
        columns: columnNames.map((c) =>
          table
            ? column(table, c)
            : c instanceof Array
            ? { expr: exprRef(c[0]), alias: qualifiedName(c[1]) }
            : { expr: exprRef(c) }
        ),
      }),
    }));

  const statementWithReturning = returningMapper(columns)
    .statement(
      builder.statement,
    )! as SelectStatement;
  return {
    statement: statementWithReturning,
    toSql: () => toSql.statement(statementWithReturning),
  };
}

function makeInsert(
  table: string,
  valueMap: Record<string, unknown>,
): SqlBuilder {
  const columns = Object.keys(valueMap).map((k) => qualifiedName(String(k)));
  const values = [
    Object.values(valueMap).map((
      value,
    ) => (typeof value === "string"
      ? { value, type: "string" }
      : (typeof value === "object" && value !== null &&
          ("returnType" in value ||
            ("type" in value &&
              (value as Record<string, unknown>)["type"] == "ref")))
      ? value
      : value === undefined
      ? { type: "default" }
      : { value: JSON.stringify(value), type: "string" })
    ),
  ] as Expr[][];
  const statement: InsertStatement = {
    "type": "insert",
    "into": qualifiedName(table),
    "insert": {
      "type": "values",
      values,
    },
    columns,
  };
  return {
    toSql: () => toSql.statement(statement),
    statement,
  };
}

function makeInsertFrom(
  table: string,
  sourceColumns: SelectedColumn[],
  columns: string[],
): SqlBuilder {
  function unique(s: string[]) {
    return Object.keys(Object.fromEntries(s.map((el) => [el, null])));
  }

  const tables = unique(
    sourceColumns.map((
      s,
    ) => ((s.expr as ExprRef)?.table?.name)).filter((t) => (t ?? "").length > 0).map(String),
  );

  const from: From[] = tables.map((t) => ({
    "type": "table",
    "name": qualifiedName(t),
  }));

  const targetColumns: Name[] = columns.map((c) => ({ name: c }));

  const statement: InsertStatement = {
    "type": "insert",
    "into": qualifiedName(table),
    "insert": {
      "type": "select",
      columns: Object.values(sourceColumns),
      from,
    },
    columns: targetColumns,
  };
  return {
    toSql: () => toSql.statement(statement),
    statement,
  };
}

function makeInsertWith(
  contextTable: string,
  context: SqlBuilder,
  insert: SqlBuilder,
): SqlBuilder {
  const statement: WithStatement = insert.statement.type === "with"
    ? {
      ...insert.statement,
      "bind": [...insert.statement.bind, {
        "alias": { "name": contextTable },
        "statement": context.statement,
      }],
    }
    : {
      "type": "with",
      "bind": [{
        "alias": { "name": contextTable },
        "statement": context.statement,
      }],
      "in": insert.statement,
    };
  return {
    statement,
    toSql: () => toSql.statement(statement),
  };
}

function makeUpsert(
  table: string,
  insertValues: Record<string, unknown>,
  updateValues?: Record<string, unknown>,
): SqlBuilder {
  const onConflictMapper = (conflictValues: Record<string, unknown>) =>
    astMapper((_map) => ({
      insert: (t) => {
        if (t.insert) {
          const onConflict = {
            "do": {
              "sets": Object.keys(conflictValues).map((k) => ({
                "column": { "name": escapeIdentifier(k) },
                "value": stringExpr(String(conflictValues[k])),
              })),
            },
          };
          return {
            ...t,
            onConflict,
          };
        }
      },
    }));

  const { statement } = makeInsert(table, insertValues);
  const withOnConflict = onConflictMapper(updateValues ?? insertValues).statement(
    statement,
  )! as InsertStatement;
  return {
    toSql: () => toSql.statement(withOnConflict),
    statement: withOnConflict,
  };
}

function column(table: string, name: string | [string, string]): SelectedColumn;
function column(literal: string): SelectedColumn;
function column(tableOrValue: string, name?: string | [string, string]): SelectedColumn {
  if (name) {
    if (name instanceof Array) {
      return { expr: exprRef(name[0], tableOrValue), alias: { name: escapeIdentifier(name[1]) } };
    } else {
      return { expr: exprRef(name, tableOrValue) };
    }
  } else {
    return { expr: stringExpr(tableOrValue) };
  }
}

function escapeLiteral(literal: string) {
  return literal.replaceAll("'", "''");
}

function escapeIdentifier(identifier: string) {
  return identifier.replaceAll('"', '""');
}

export {
  column,
  makeDelete,
  makeInsert,
  makeInsertFrom,
  makeInsertWith,
  makeSelect,
  makeUpdate,
  makeUpsert,
  returning,
  selection,
  where,
  order
};
export type { SqlBuilder };
