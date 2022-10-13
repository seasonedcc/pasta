import { generateSchema } from "../schema-generator.ts";
import { withTestDatabase } from "./test-database.ts";
import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";

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
      created_at?: string | TimestampFunctionCall
    }
  },
  user: {
    keys: {
      id: number;
    };
    columns: {
      id?: number;
      data: string;
      created_at?: string | TimestampFunctionCall;
      tags?: JSONValue
    }
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
    }
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
    const schema = await generateSchema(sql);

    assertEquals(schema, expectedSchema);
  }),
);
