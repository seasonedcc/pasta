import { JSONValue, TimestampFunctionCall } from "./pg-catalog.ts";

type Tables = {
  user: {
    keys: {
      id: number;
    };
    columns: {
      id?: number;
      data: string;
      created_at?: string | TimestampFunctionCall;
      tags?: JSONValue;
    };
    associations:
      | { user_account: { account_id: number } }
      | { account: { name: string } };
  };
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
      created_at?: string | TimestampFunctionCall;
    };
    associations:
      | { user: { data: string } }
      | { account: { name: string } };
  };
  account: {
    keys: {
      id: number;
    };
    columns: {
      id?: number;
      name: string;
      created_at?: string | TimestampFunctionCall;
    };
    associations:
      | { user_account: { user_id: number } }
      | { user: { data: string } };
  };
};

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
  user: {
    user_account: {
      kind: "1xN",
      table: "user_account",
      fks: { user_id: "id" },
    },
    account: {
      kind: "MxN",
      associativeTable: "user_account",
      table: "account",
      fks: { user_id: ["user", "id"], account_id: ["account", "id"] },
    },
  },
  account: {
    user_account: {
      kind: "1xN",
      table: "user_account",
      fks: { account_id: "id" },
    },
    user: {
      kind: "MxN",
      associativeTable: "user_account",
      table: "user",
      fks: { "user_id": ["user", "id"], "account_id": ["account", "id"] },
    },
  },
  user_account: null,
};

export type { TableName, Tables };
export { associations };
