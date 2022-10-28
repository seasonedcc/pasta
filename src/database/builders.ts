
import { ColumnsOf, KeysOf, TableName } from "./schema.ts";
import {
  insert,
  InsertBuilder,
  select,
  SelectBuilder,
} from "./statement-builder.ts";

type TableBuilder<T extends TableName> = {
  select: SelectBuilder<T>;
  insert: (values: ColumnsOf<T>) => InsertBuilder<T>;
  where: (values: ColumnsOf<T>) => SelectBuilder<T>;
  unique: (values: KeysOf<T>) => SelectBuilder<T>;
};


const account: TableBuilder<"account"> = {
  select: select("account")(),
  insert: insert("account"),
  where: select("account")().where,
  unique: select("account")().unique,
};

const settings: TableBuilder<"settings"> = {
  select: select("settings")(),
  insert: insert("settings"),
  where: select("settings")().where,
  unique: select("settings")().unique,
};

const user: TableBuilder<"user"> = {
  select: select("user")(),
  insert: insert("user"),
  where: select("user")().where,
  unique: select("user")().unique,
};

const user_account: TableBuilder<"user_account"> = {
  select: select("user_account")(),
  insert: insert("user_account"),
  where: select("user_account")().where,
  unique: select("user_account")().unique,
};

const tables = { account, settings, user, user_account };

export { tables };
