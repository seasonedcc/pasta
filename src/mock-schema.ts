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
    associations: "user_account" | "account";
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
    associations: "user" | "account";
  };
  account: {
    keys: {
      id: number;
    };
    columns: {
      id?: number;
      name: string;
    };
    associations: "user_account" | "user";
  };
};

type TableName = keyof Tables;

const associations: [TableName, TableName, Record<string, string>][] = [
  ["user", "user_account", { id: "user_id" }],
  ["user_account", "account", { account_id: "id" }],
  ["user_account", "user", { user_id: "id" }],
  ["account", "user_account", { id: "account_id" }],
];

export type { TableName, Tables };
export { associations };
