import {
  astMapper,
  Expr,
  Name,
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

const returningMapper = (columnNames: Name[]) =>
  astMapper((map) => ({
    insert: (t) => {
      if (t.returning) {
        return {
          ...t,
          columnNames,
        };
      }
      if (t.insert) {
        return {
          ...t,
          returning: [{ expr: { type: "ref", name: "data" } }],
        };
      }

      // call the default implementation of 'tableRef'
      // this will ensure that the subtree is also traversed.
      return map.super().insert(t);
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
    const seedBuilder = {
      toSql: () => toSql.statement(statement),
      statement,
    };
    const returning = addReturning(seedBuilder) as Returning<typeof table>;
    return { ...seedBuilder, returning };
  };

export { insert, pgVersion, uuid };
