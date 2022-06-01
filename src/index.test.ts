import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import { toSql } from "https://deno.land/x/pgsql_ast_parser/mod.ts";

import { insert, pgVersion, uuid } from "./index.ts";

Deno.test("pgVersion", () => {
  assertEquals(toSql.statement(pgVersion()), "SELECT (version () )");
});

Deno.test("uuid", () => {
  assertEquals(toSql.statement(uuid()), "SELECT (gen_random_uuid () )");
});

Deno.test("insert", () => {
  const insertUserStatement = insert("user")({ data: "test" }).toSql();

  assertEquals(
    insertUserStatement,
    `INSERT INTO "user"  (data) VALUES (('test'))`,
  );
});

Deno.test("returning", () => {
  const insertUserStatement = insert("user")({ data: "test" }).returning({
    data: true,
  }).toSql();

  assertEquals(
    insertUserStatement,
    `INSERT INTO "user"  (data) VALUES (('test'))  RETURNING data`,
  );
});
