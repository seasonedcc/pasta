import { db, functions, tables } from "../database/index.ts";
import { assertExists, withTestDatabase } from "./prelude.ts";

const { user } = tables;
const { now } = functions;

Deno.test(
  "Executing your first statement",
  withTestDatabase(async () => {
    await db.transaction(
      user.insert({ email: "user2@someaccout.tld" }),
    );
  }),
);

Deno.test(
  "Inserting data with its associations",
  withTestDatabase(async () => {
    await db.transaction(
      user.insert(
        { email: "user2@someaccout.tld", created_at: now() },
      ).associate(
        { account: { name: "some product name" } },
      ),
    );
  }),
);

Deno.test(
  "Returning data from a transaction",
  withTestDatabase(async () => {
    const [{ id }] = await db.transaction(
      user.insert(
        { email: "user2@someaccout.tld", created_at: now() },
      ).associate(
        { account: { name: "some product name" } },
      ).returning(["id"]),
    );
    assertExists(id);
  }),
);

Deno.test(
  "Quering existing data",
  withTestDatabase(async () => {
    await db.transaction(
      user.insert({ email: "user2@someaccout.tld" }),
    );

    const [{ id, email }] = await db.transaction(
      user.select.returning(["id", "email"]),
    );
    assertExists(id);
    assertExists(email);
  }),
);

Deno.test(
  "Filtering existing data",
  withTestDatabase(async () => {
    await db.transaction(
      user.insert({ email: "user2@someaccout.tld" }),
    );

    const [{ id, email }] = await db.transaction(
      user.where({ email: "user2@someaccout.tld" }).returning(["id", "email"]),
    );
    assertExists(id);
    assertExists(email);
  }),
);

Deno.test(
  "Finding unique records from a single table",
  withTestDatabase(async () => {
    await db.transaction(
      user.insert({ email: "user2@someaccout.tld" }),
    );

    const [{ id, email }] = await db.transaction(
      user.unique({ email: "user2@someaccout.tld" }).returning(["id", "email"]),
    );
    assertExists(id);
    assertExists(email);
  }),
);
