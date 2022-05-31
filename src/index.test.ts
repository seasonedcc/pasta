import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import { Expr, Statement, toSql } from "https://deno.land/x/pgsql_ast_parser/mod.ts";

import { insert, pgVersion, uuid } from "./index.ts";

Deno.test("pgVersion", () => {
  assertEquals(toSql.statement(pgVersion()), "SELECT (version () )");
});

Deno.test("uuid", () => {
  assertEquals(toSql.statement(uuid()), "SELECT (gen_random_uuid () )");
});

Deno.test("insert", () => {
  const insertUserStatement = insert("user")({ data: "test" })();

  assertEquals(
    toSql.statement(insertUserStatement),
    `INSERT INTO "user"  (data) VALUES (('test'))`,
  );
});
