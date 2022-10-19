import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import { insert } from "../statement-builder.ts";
import { transaction } from "../transaction.ts";
import { withTestDatabase } from "./test-database.ts";

Deno.test(
  "insert",
  withTestDatabase(async (sql) => {
    const builder = insert("user")({ email: "user@domain.tld" });

    await transaction(builder);

    const [{ count }] =
      await sql`SELECT count(*) FROM "user" WHERE email = 'user@domain.tld'`;

    assertEquals(count, "1");

    await sql.end({ timeout: 5 });
  }),
);
