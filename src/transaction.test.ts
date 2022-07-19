import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import { insert } from "./mutations.ts";
import { transaction } from "./transaction.ts";
import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";

function withTestDatabase(
  testCase: (sql: postgres.Sql<{}>) => Promise<void>,
): () => Promise<void> {
  return async () => {
    const uri = "postgres://localhost/pasta_test";
    Deno.env.set("DATABASE_URL", uri);
    const sql = postgres(uri);
    await sql
      `DROP TABLE IF EXISTS public."user", public.account, public.user_account CASCADE`;
    await sql`CREATE TABLE public."user" (
        id serial PRIMARY KEY,
        data text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        tags jsonb NOT NULL DEFAULT '[]'
      )`;
    await sql`CREATE TABLE public.account (
      id serial PRIMARY KEY,
      name text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE public.user_account (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES "user",
      account_id integer NOT NULL REFERENCES public.account,
      created_at timestamp NOT NULL DEFAULT now()
    )`;

    return testCase(sql);
  };
}

Deno.test(
  "insert",
  withTestDatabase(async (sql) => {
    const builder = insert("user")({ data: "test" });

    await transaction(builder);

    const [{ count }] = await sql
      `SELECT count(*) FROM "user" WHERE data = 'test'`;

    assertEquals(count, "1");

    await sql.end({ timeout: 5 });
  }),
);
