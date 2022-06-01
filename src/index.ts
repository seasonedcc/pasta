import {
  Expr,
  parseFirst,
  Statement,
  toSql,
} from "https://deno.land/x/pgsql_ast_parser@10.2.0/mod.ts";

const pgVersion = () => parseFirst("SELECT version()");

const uuid = () => parseFirst("SELECT gen_random_uuid()");

type MockSchema = {
  user: {
    columns: {
      data: string;
    };
  };
  account: {
    columns: {
      name: string;
    };
  };
};

type Tables = MockSchema;
type StatementBuilder = {
  statement: Statement;
  toSql: () => string;
};

type InsertBuilder = <T extends keyof Tables>(
  table: T,
) => (values: Tables[T]["columns"]) => StatementBuilder;

const insert: InsertBuilder = (table) =>
  (valueMap) => {
    const columns = Object.keys(valueMap).map((k) => ({ name: k }));
    const values = [
      Object.values(valueMap).map((value) => ({ value, type: "string" })),
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
    return {
      toSql: () => toSql.statement(statement),
      statement,
    };
  };

export { insert, pgVersion, uuid };
