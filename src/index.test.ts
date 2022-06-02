import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";

import { insert, now, update, upsert } from "./index.ts";

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

  // Should replace returning fields
  assertEquals(
    insertUserBuilder.returning(["data", "tags"]).toSql(),
    `INSERT INTO "user"  (data) VALUES (('test'))  RETURNING data , tags`,
  );
});

Deno.test("upsert", () => {
  const upsertUserBuilder = upsert("user")({ data: "test" }).returning([
    "data",
  ]);

  assertEquals(
    upsertUserBuilder.toSql(),
    `INSERT INTO "user"  (data) VALUES (('test')) ON CONFLICT  DO UPDATE SET data = ('test')   RETURNING data`,
  );
});

Deno.test("update", () => {
  const upsertUserBuilder = update("user")({ id: 1 }, { data: "test" });

  assertEquals(
    upsertUserBuilder.toSql(),
    `UPDATE "user"   SET data = ('test')  WHERE (id = ('1'))`,
  );

  const upsertUserAccountBuilder = update("user_account")({ id: 1 }, {
    user_id: 1,
    account_id: 2,
  });

  assertEquals(
    upsertUserAccountBuilder.toSql(),
    `UPDATE user_account   SET user_id = ('1') , account_id = ('2')  WHERE (id = ('1'))`,
  );
});

Deno.test("update wiith multiple keys", () => {
  const upsertUserAccountBuilderWithCompositeKey = update("user_account")({
    user_id: 1,
    account_id: 2,
  }, {
    user_id: 1,
    account_id: 2,
  });

  assertEquals(
    upsertUserAccountBuilderWithCompositeKey.toSql(),
    `UPDATE user_account   SET user_id = ('1') , account_id = ('2')  WHERE ((user_id = ('1')) AND (account_id = ('2')))`,
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
