import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";

function withTestDatabase(
  testCase: (sql: postgres.Sql<{}>) => Promise<void>,
): () => Promise<void> {
  return async () => {
    const uri = "postgres://localhost/pasta_test";
    Deno.env.set("DATABASE_URL", uri);
    const sql = postgres(uri);
    await sql`DROP TABLE IF EXISTS public."user", public.account, public.user_account, public.settings CASCADE`;
    await sql`CREATE TABLE public."user" (
        id serial PRIMARY KEY,
        email text NOT NULL UNIQUE,
        created_at timestamp NOT NULL DEFAULT now(),
        tags jsonb NOT NULL DEFAULT '[]'
      )`;
    await sql`CREATE TABLE public.account (
      id serial PRIMARY KEY,
      name text NOT NULL,
      deactivated_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      UNIQUE (name, deactivated_at)
    )`;
    await sql`CREATE TABLE public.user_account (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES "user",
      account_id integer NOT NULL REFERENCES public.account,
      created_at timestamp NOT NULL DEFAULT now()
    )`;
    await sql`CREATE UNIQUE INDEX user_account_key
      ON public.user_account (user_id, account_id)`;
    await sql`CREATE TABLE public.settings (
      key text PRIMARY KEY,
      value text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )`;

    return testCase(sql).then(() => sql.end());
  };
}

export { withTestDatabase };
