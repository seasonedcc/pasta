import { extractSchema } from "../schema-extractor.ts";
import { assertEquals, withTestDatabase } from "./prelude.ts";

const expectedSchema =
  `import { JSONValue, TimestampFunctionCall } from "./pg-catalog.ts";
type Tables = {
  account: {
    keys: {
      id: number;
    };
    columns: {
      id?: number;
      name: string;
      deactivated_at?: string | TimestampFunctionCall;
      created_at?: string | TimestampFunctionCall
    };
    associations:
      | { user: { email: string } }
      | { user_account: { user_id: number } };
  },
  user: {
    keys: {
      id: number;
    } | {
      email: string;
    };
    columns: {
      id?: number;
      email: string;
      created_at?: string | TimestampFunctionCall;
      tags?: JSONValue
    };
    associations:
      | { account: { name: string } }
      | { user_account: { account_id: number } };
  },
  user_account: {
    keys: {
      id: number;
    } | {
      user_id: number;
      account_id: number;
    };
    columns: {
      id?: number;
      user_id: number;
      account_id: number;
      created_at?: string | TimestampFunctionCall
    };
    associations:
      | { account: { name: string } }
      | { user: { email: string } };
  }
}
type TableName = keyof Tables;
type Association =
| { kind: "1xN"; table: TableName; fks: Record<string, string> }
| {
  kind: "MxN";
  table: TableName;
  associativeTable: TableName;
  fks: Record<string, [string, string]>;
};
type Associations = Record<TableName, null | Record<string, Association>>;

const associations: Associations = {
  account: {
    user_account: {
      kind: "1xN",
      table: "user_account",
      fks: { account_id: "id" }
    },
    user: {
      kind: "MxN",
      associativeTable: "user_account",
      table: "user",
      fks: {"account_id":["account","id"],"user_id":["user","id"]}
    }
  },
  user: {
    user_account: {
      kind: "1xN",
      table: "user_account",
      fks: { user_id: "id" }
    },
    account: {
      kind: "MxN",
      associativeTable: "user_account",
      table: "account",
      fks: {"user_id":["user","id"],"account_id":["account","id"]}
    }
  },
  user_account: {
    account: {
      kind: "1xN",
      table: "account",
      fks: { id: "account_id" }
    },
    user: {
      kind: "1xN",
      table: "user",
      fks: { id: "user_id" }
    }
  }
};

export type { TableName, Tables };
export { associations };
`;

Deno.test(
  "generateSchema",
  withTestDatabase(async (sql) => {
    const schema = await extractSchema(sql);

    assertEquals(schema, expectedSchema);
  }),
);
