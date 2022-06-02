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
    columns: {
      data: string;
      created_at?: string | TimestampFunctionCall;
      tags?: JSONValue;
    };
  };
  account: {
    columns: {
      name: string;
    };
  };
};

type Tables = MockSchema;

const returningMapper = (columnNames: Name[]) =>
  astMapper((map) => ({
    insert: (t) => {
      if (t.insert) {
        return {
          ...t,
          returning: [{ expr: { type: "ref", name: "data" } }],
        };
      }

      return map.insert(t);
    },
  }));

type ReturningOptions<T extends keyof Tables> = [keyof Tables[T]["columns"]];
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

function addReturning<T extends keyof Tables>(builder: SeedBuilder) {
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

type InsertBuilder = <T extends keyof Tables>(
  table: T,
) => (values: Tables[T]["columns"]) => StatementBuilder<T>;

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

export { insert, now, uuid };
