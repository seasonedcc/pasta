import {
  Expr,
  parseFirst,
  Statement,
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

type Tables = MockSchema
type StatementBuilder = () => Statement;
type InsertBuilder = <T extends keyof Tables>(
  table: T,
) => (values: Tables[T]["columns"]) => StatementBuilder;

const insert: InsertBuilder = (table) =>
  (valueMap) =>
    () => {
      const columns = Object.keys(valueMap).map((k) => ({name: k}))
      const values = [Object.values(valueMap).map((value) => ({value, type: "string"}))] as Expr[][]
      return {
        "type": "insert",
        "into": { "name": table },
        "insert": {
          "type": "values",
          values,
        },
        columns,
      };
    };

export { pgVersion, uuid, insert };
