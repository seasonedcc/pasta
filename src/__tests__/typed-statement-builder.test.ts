import { assertEquals } from "./prelude.ts";
import { now } from "../database/pg-catalog.ts";

import {
  insert,
  insertWith,
  select,
  update,
  upsert,
} from "../database/typed-statement-builder.ts";

Deno.test("insert", () => {
  const insertUserStatement = insert("user")({ email: "user@domain.tld" })
    .toSql();

  assertEquals(
    insertUserStatement,
    `INSERT INTO "user"  (email) VALUES (('user@domain.tld'))`,
  );
});

Deno.test("insert json", () => {
  const insertWithJson = insert("user")({
    email: "user@domain.tld",
    tags: [{ someKey: "some value" }],
  }).toSql();

  assertEquals(
    insertWithJson,
    `INSERT INTO "user"  (email, tags) VALUES (('user@domain.tld'), ('[{"someKey":"some value"}]'))`,
  );
});

Deno.test("returning", () => {
  const insertUserBuilder = insert("user")({ email: "user@domain.tld" })
    .returning([
      "email",
    ]);

  assertEquals(
    insertUserBuilder.toSql(),
    `INSERT INTO "user"  (email) VALUES (('user@domain.tld'))  RETURNING email`,
  );

  // Should replace returning fields
  assertEquals(
    insertUserBuilder.returning([
      "email",
      "tags",
    ]).toSql(),
    `INSERT INTO "user"  (email) VALUES (('user@domain.tld'))  RETURNING email , tags`,
  );
});

Deno.test("upsert", () => {
  const upsertUserBuilder = upsert("user")({ email: "user@domain.tld" })
    .returning([
      "email",
    ]);

  assertEquals(
    upsertUserBuilder.toSql(),
    `INSERT INTO "user"  (email) VALUES (('user@domain.tld')) ON CONFLICT  DO UPDATE SET email = ('user@domain.tld')   RETURNING email`,
  );
});

Deno.test("update", () => {
  const upsertUserBuilder = update("user")({ id: 1 }, {
    email: "user@domain.tld",
  });

  assertEquals(
    upsertUserBuilder.toSql(),
    `UPDATE "user"   SET email = ('user@domain.tld')  WHERE ((id) = (('1')))`,
  );

  const upsertUserAccountBuilder = update("user_account")({ id: 1 }, {
    user_id: 1,
    account_id: 2,
  });

  assertEquals(
    upsertUserAccountBuilder.toSql(),
    `UPDATE user_account   SET user_id = ('1') , account_id = ('2')  WHERE ((id) = (('1')))`,
  );
});

Deno.test("update with multiple keys", () => {
  const upsertUserAccountBuilderWithCompositeKey = update("user_account")({
    user_id: 1,
    account_id: 2,
  }, {
    user_id: 1,
    account_id: 2,
  });

  assertEquals(
    upsertUserAccountBuilderWithCompositeKey.toSql(),
    `UPDATE user_account   SET user_id = ('1') , account_id = ('2')  WHERE ((user_id, account_id) = (('1'), ('2')))`,
  );
});

Deno.test("now", () => {
  const insertUserStatement = insert("user")({
    email: "user@domain.tld",
    created_at: now(),
  }).toSql();

  assertEquals(
    insertUserStatement,
    `INSERT INTO "user"  (email, created_at) VALUES (('user@domain.tld'), (now () ))`,
  );
});

Deno.test("insert with CTE without references", () => {
  const insertUserStatement = insertWith(
    "user",
    insert("user")({
      email: "user@domain.tld",
      created_at: now(),
    }).returning(["id"]),
  )(insert("user_account")({ account_id: 0, user_id: 0 })).returning([
    "created_at",
  ]);

  assertEquals(
    insertUserStatement.toSql(),
    `WITH "user" AS (INSERT INTO "user"  (email, created_at) VALUES (('user@domain.tld'), (now () ))  RETURNING id ) INSERT INTO user_account  (account_id, user_id) VALUES (('0'), ('0'))  RETURNING created_at`,
  );
});

Deno.test("insert with MxN associations", () => {
  const insertUserStatement = insert("user")({
    email: "user@domain.tld",
    created_at: now(),
  }).associate({ account: { name: "some account" } });

  assertEquals(
    insertUserStatement.toSql(),
    `WITH "user" AS (INSERT INTO "user"  (email, created_at) VALUES (('user@domain.tld'), (now () ))  RETURNING id ) , account AS (INSERT INTO account  (name) VALUES (('some account'))  RETURNING id ) INSERT INTO user_account  (user_id, account_id) SELECT "user" .id , account .id  FROM "user"  ,account`,
  );
});

Deno.test("insert with 1xN associations", () => {
  const insertUserStatement = insert("user")({
    email: "user@domain.tld",
    created_at: now(),
  }).associate({ user_account: { account_id: 1 } });

  assertEquals(
    insertUserStatement.toSql(),
    `WITH "user" AS (INSERT INTO "user"  (email, created_at) VALUES (('user@domain.tld'), (now () ))  RETURNING id ) INSERT INTO user_account  (user_id, account_id) SELECT "user" .id , ('1')  FROM "user"`,
  );
});

Deno.test("select from user", () => {
  const selectNothing = select("user")();

  assertEquals(
    selectNothing.toSql(),
    `SELECT  FROM "user"`,
  );
});

Deno.test("select id from user", () => {
  const selectId = select("user")().returning(["id"]);

  assertEquals(
    selectId.toSql(),
    `SELECT id  FROM "user"`,
  );
});

Deno.test("select id from account where name = 'some account'", () => {
  const selectId = select("account")().where({ name: "some account" })
    .returning(["id"]);

  assertEquals(
    selectId.toSql(),
    `SELECT id  FROM account   WHERE ((name) = (('some account')))`,
  );
});

Deno.test("unique - select id from user where email = 'user@domain.tld'", () => {
  const selectId = select("user")().unique({ email: "user@domain.tld" })
    .returning(["id"]);

  assertEquals(
    selectId.toSql(),
    `SELECT id  FROM "user"   WHERE ((email) = (('user@domain.tld')))`,
  );
});
