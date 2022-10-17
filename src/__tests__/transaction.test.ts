import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import { insert } from "../statement-builder.ts";
import { transaction } from "../transaction.ts";
import { withTestDatabase } from "./test-database.ts";

Deno.test(
  "insert",
  withTestDatabase(async (sql) => {
    const builder = insert("user")({ data: "test" });

    await transaction(builder);

    const [{ count }] =
      await sql`SELECT count(*) FROM "user" WHERE data = 'test'`;

    assertEquals(count, "1");

    await sql.end({ timeout: 5 });
  }),
);
