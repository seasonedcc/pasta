import { JSONValue, TimestampFunctionCall } from "./pg-catalog.ts";
type Tables = {
  account: {
    columns: {
      id: number;
      name: string;
      created_at: string
    }
  },
  user: {
    columns: {
      id: number;
      data: string;
      created_at: string;
      tags: JSONValue
    }
  },
  user_account: {
    columns: {
      id: number;
      user_id: number;
      account_id: number;
      created_at: string
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
export type { TableName, Tables };
