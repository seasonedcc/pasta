import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";

import { insert, now } from "./index.ts";

Deno.test("insert", () => {
  const insertUserStatement = insert("user")({ data: "test" }).toSql();

  assertEquals(
    insertUserStatement,
    `INSERT INTO "user"  (data) VALUES (('test'))`,
  );
});

Deno.test("insert json", () => {
  const insertWithJson = insert("user")({
    data: "test",
    tags: [{ someKey: "some value" }],
  }).toSql();

  assertEquals(
    insertWithJson,
    `INSERT INTO "user"  (data, tags) VALUES (('test'), ('[{"someKey":"some value"}]'))`,
  );
});

Deno.test("returning", () => {
  const insertUserBuilder = insert("user")({ data: "test" }).returning([
    "data",
  ]);

  assertEquals(
    insertUserBuilder.toSql(),
    `INSERT INTO "user"  (data) VALUES (('test'))  RETURNING data`,
  );

  assertEquals(
    insertUserBuilder.returning(["data"]).toSql(),
    `INSERT INTO "user"  (data) VALUES (('test'))  RETURNING data`,
    "Should be idempotent",
  );
});

Deno.test("now", () => {
  const insertUserStatement = insert("user")({
    data: "test",
    created_at: now(),
  }).toSql();

  assertEquals(
    insertUserStatement,
    `INSERT INTO "user"  (data, created_at) VALUES (('test'), (now () ))`,
  );
});
