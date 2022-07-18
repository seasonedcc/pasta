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
    await sql`DROP TABLE IF EXISTS "user"`;
    await sql`CREATE TABLE "user" (data text PRIMARY KEY)`;

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
