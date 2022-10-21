import { assertEquals, assertRejects, withTestDatabase } from "./prelude.ts";
import { insert } from "../../database/statement-builder.ts";
import {
  transaction,
  transactionReturning,
} from "../../database/transaction.ts";

Deno.test(
  "transaction - insert",
  withTestDatabase(async (sql) => {
    const builder = insert("user")({ email: "user@domain.tld" });

    await transaction(builder);

    const [{ count }] =
      await sql`SELECT count(*) FROM "user" WHERE email = 'user@domain.tld'`;

    assertEquals(count, "1");

    await sql.end({ timeout: 5 });
  }),
);

Deno.test(
  "transaction - insert returning",
  withTestDatabase(async (sql) => {
    const builder = insert("user")({ email: "user@domain.tld" }).returning([
      "email",
    ]);

    const [{ email }] = await transaction(builder);

    assertEquals(email, "user@domain.tld");

    await sql.end({ timeout: 5 });
  }),
);

Deno.test(
  "transactionReturning - insert",
  withTestDatabase(async () => {
    await assertRejects(() =>
      transactionReturning(insert("user")({ email: "user@domain.tld" }))
    );
  }),
);

Deno.test(
  "transactionReturning - insert returning",
  withTestDatabase(async (sql) => {
    const builder = insert("user")({ email: "user@domain.tld" }).returning([
      "email",
    ]);

    const [{ email }] = await transactionReturning(builder);

    assertEquals(email, "user@domain.tld");

    await sql.end({ timeout: 5 });
  }),
);
