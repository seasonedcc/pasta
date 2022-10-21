import { db, functions, tables } from "../database/index.ts";
import { withTestDatabase } from "./prelude.ts";

const { user } = tables;

Deno.test(
  "transaction - insert",
  withTestDatabase(async () => {
    await db.transaction(
      user.insert({ email: "user2@someaccout.tld" }),
    );
  }),
);

Deno.test(
  "transaction - insert.associate",
  withTestDatabase(async () => {
    await db.transaction(
      user.insert(
        { email: "user2@someaccout.tld", created_at: functions.now() },
      ).associate(
        { account: { name: "some product name" } },
      ),
    );
  }),
);
