import {
  astMapper,
  Expr,
  ExprCall,
  Name,
  Statement,
  toSql,
} from "https://deno.land/x/pgsql_ast_parser@10.2.0/mod.ts";

type UUIDFunctionCall = ExprCall & { returnType: "uuid" };
type TimestampFunctionCall = ExprCall & { returnType: "timestamp" };
type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

const uuid = () => (
  {
    "type": "call",
    "function": { "name": "gen_random_uuid" },
    "args": [],
    "returnType": "uuid",
  } as UUIDFunctionCall
);

const now = () => (
  {
    "type": "call",
    "function": { "name": "now" },
    "args": [],
    "returnType": "timestamp",
  } as TimestampFunctionCall
);

type MockSchema = {
  user: {
    keys: {
      id: number;
    };
    columns: {
      id?: number;
      data: string;
      created_at?: string | TimestampFunctionCall;
      tags?: JSONValue;
    };
  };
  user_account: {
    keys: {
      id: number;
    } | {
      user_id: number;
      account_id: number;
    };
    columns: {
      id?: number;
      user_id: number;
      account_id: number;
      created_at?: string | TimestampFunctionCall;
    };
  };
  account: {
    keys: {
      id: number;
    };
    columns: {
      id?: number;
      name: string;
    };
  };
};

type Tables = MockSchema;

type ReturningOptions<T extends keyof Tables> = (keyof Tables[T]["columns"])[];

type Returning<T extends keyof Tables> = (
  options: ReturningOptions<T>,
) => StatementBuilder<T>;

type SeedBuilder = {
  statement: Statement;
  toSql: () => string;
};

type StatementBuilder<T extends keyof Tables> = SeedBuilder & {
  returning: Returning<T>;
};

type InsertBuilder = <T extends keyof Tables>(
  table: T,
) => (values: Tables[T]["columns"]) => StatementBuilder<T>;

type UpsertBuilder = <T extends keyof Tables>(
  table: T,
) => (
  insertValues: Tables[T]["columns"],
  updateValues?: Tables[T]["columns"],
) => StatementBuilder<T>;

type UpdateBuilder = <T extends keyof Tables>(
  table: T,
) => (
  keyValues: Tables[T]["keys"],
  setValues: Tables[T]["columns"],
) => StatementBuilder<T>;

function addReturning<T extends keyof Tables>(builder: SeedBuilder) {
  const returningMapper = (columnNames: Name[]) =>
    astMapper((_map) => ({
      insert: (t) => {
        if (t.insert) {
          return {
            ...t,
            returning: columnNames.map((c) => ({
              expr: { type: "ref", name: c.name },
            })),
          };
        }
      },
    }));

  return function (options: ReturningOptions<T>): StatementBuilder<T> {
    const returningColumns = options.map((c) => ({
      name: c,
    } as Name));
    const statementWithReturning = returningMapper(returningColumns)
      .statement(
        builder.statement,
      )!;
    const seedBuilder = {
      statement: statementWithReturning,
      toSql: () => toSql.statement(statementWithReturning),
    };
    const returning = addReturning<T>(seedBuilder);
    return { ...seedBuilder, returning };
  };
}

const insert: InsertBuilder = (table) =>
  (valueMap) => {
    const columns = Object.keys(valueMap).map((k) => ({ name: k }));
    const values = [
      Object.values(valueMap).map((
        value,
      ) => (typeof value === "string"
        ? { value, type: "string" }
        : (typeof value === "object" && "returnType" in value)
        ? value
        : { value: JSON.stringify(value), type: "string" })
      ),
    ] as Expr[][];
    const statement: Statement = {
      "type": "insert",
      "into": { "name": table },
      "insert": {
        "type": "values",
        values,
      },
      columns,
    };
    const seedBuilder = {
      toSql: () => toSql.statement(statement),
      statement,
    };
    const returning = addReturning(seedBuilder) as Returning<typeof table>;
    return { ...seedBuilder, returning };
  };

const upsert: UpsertBuilder = (table) => {
  const onConflictMapper = (conflictValues: Record<string, unknown>) =>
    astMapper((_map) => ({
      insert: (t) => {
        if (t.insert) {
          return {
            ...t,
            onConflict: {
              "do": {
                "sets": Object.keys(conflictValues).map((k) => ({
                  "column": { "name": k },
                  "value": {
                    "type": "string",
                    "value": String(conflictValues[k]),
                  },
                })),
              },
            },
          };
        }
      },
    }));

  return (insertValues, updateValues) => {
    const { statement } = insert(table)(insertValues);
    const withOnConflict = onConflictMapper(updateValues || insertValues)
      .statement(statement)!;
    const seedBuilder = {
      toSql: () => toSql.statement(statement),
      statement: withOnConflict,
    };
    const returning = addReturning(seedBuilder) as Returning<typeof table>;
    return { ...seedBuilder, returning };
  };
};

const update: UpdateBuilder = (table) =>
  (keyValues, setValues) => {
    const eq = (name: string, value: string) =>
      (
        {
          "type": "binary",
          "left": { "type": "ref", name },
          "right": {
            "type": "string",
            value,
          },
          "op": "=",
        }
      ) as Expr;
    const and = (left: Expr, right: Expr) =>
      ({
        "type": "binary",
        left,
        right,
        "op": "AND",
      }) as Expr;
    const statement: Statement = {
      "type": "update",
      "table": { "name": table },
      "sets": Object.keys(setValues).map((k) => ({
        "column": { "name": k },
        "value": {
          "type": "string",
          "value": String((setValues as Record<string, unknown>)[k]),
        },
      })),
      "where": Object.keys(keyValues).reduce(
        (previousValue, currentValue) => {
          const currentEquality = eq(
            currentValue,
            String(
              (keyValues as Record<string, unknown>)[currentValue],
            ),
          );
          return (
            ("type" in previousValue)
              ? and(previousValue as Expr, currentEquality)
              : currentEquality
          );
        },
        {},
      ) as Expr,
    };
    const seedBuilder = {
      statement,
      toSql: () => toSql.statement(statement),
    };
    const returning = addReturning(seedBuilder) as Returning<typeof table>;
    return { ...seedBuilder, returning };
  };

export { insert, now, update, upsert, uuid };
