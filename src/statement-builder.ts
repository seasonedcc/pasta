import * as sql from "./sql-builder.ts";

type SqlBuilder = sql.SqlBuilder

type SelectBuilder = SqlBuilder & {
  columns: (columns: Parameters<typeof sql.selection>[1], table?: string) => SelectBuilder 
  literals: (columns: Parameters<typeof sql.selectionLiteral>[1]) => SelectBuilder 
  subqueries: (columns: Parameters<typeof sql.selectionSubquery>[1]) => SelectBuilder 
  order: (columns: Parameters<typeof sql.order>[1], table?: string) => SelectBuilder 
  where: (columns: Parameters<typeof sql.where>[1]) => SelectBuilder 
  filterRegex: (columns: Parameters<typeof sql.regex>[0], pattern: Parameters<typeof sql.regex>[1]) => SelectBuilder 
  unionAll: (anotherBuilder: SelectBuilder) => SelectBuilder 
  join: (relation: Parameters<typeof sql.join>[1], on: Parameters<typeof sql.join>[2], schema?: Parameters<typeof sql.join>[3], type?: Parameters<typeof sql.join>[4]) => SelectBuilder
  limit: (value: Parameters<typeof sql.limit>[1]) => SelectBuilder
  offset: (value: Parameters<typeof sql.offset>[1]) => SelectBuilder
}

function makeSelect(table: string | [string, string], schema?: string): SelectBuilder {
  const builder = sql.makeSelect(table, schema) as SelectBuilder
  const literals: SelectBuilder["literals"] = (columns) => {
    const { statement, toSql } = sql.selectionLiteral(builder, columns)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  const subqueries: SelectBuilder["subqueries"] = (columns) => {
    const { statement, toSql } = sql.selectionSubquery(builder, columns)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  const columns: SelectBuilder["columns"] = (columns, table) => {
    const { statement, toSql } = sql.selection(builder, columns, table)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  const order: SelectBuilder["order"] = (columns, table) => {
    const { statement, toSql } = sql.order(builder, columns, table)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  const where: SelectBuilder["where"] = (columns) => {
    const { statement, toSql } = sql.where(builder, columns)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  const filterRegex: SelectBuilder["filterRegex"] = (columns, pattern) => {
    const { statement, toSql } = sql.whereExpression(builder, sql.regex(columns, pattern))
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  const unionAll: SelectBuilder["unionAll"] = (anotherBuilder) => {
    const { statement, toSql } = sql.makeUnionAll(builder, anotherBuilder)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  const join: SelectBuilder["join"] = (relation, on, schema, type) => {
    const { statement, toSql } = sql.join(builder, relation, on, schema, type)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  const limit: SelectBuilder["limit"] = (value) => {
    const { statement, toSql } = sql.limit(builder, value)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  const offset: SelectBuilder["offset"] = (value) => {
    const { statement, toSql } = sql.offset(builder, value)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }

  builder.columns = columns
  builder.literals = literals
  builder.subqueries = subqueries
  builder.order = order
  builder.where = where
  builder.filterRegex = filterRegex
  builder.unionAll = unionAll
  builder.join = join
  builder.limit = limit
  builder.offset = offset
  return builder
}

type InsertBuilder = sql.SqlBuilder & {
  returning: (columns: Parameters<typeof sql.returning>[1]) => InsertBuilder
}
type UpdateBuilder = InsertBuilder
type UpsertBuilder = InsertBuilder
type DeleteBuilder = InsertBuilder

function makeInsert(
  table: string,
  valueMap: Record<string, unknown>,
): InsertBuilder {
  const builder = sql.makeInsert(table, valueMap) as InsertBuilder
  const returning = (columns: Parameters<typeof sql.returning>[1]) => {
    const { statement, toSql } = sql.returning(builder, columns)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  builder.returning = returning
  return builder
}

function makeUpdate(
  table: string,
  keyValues: Record<string, unknown>,
  setValues: Record<string, unknown>,
): UpdateBuilder {
  const builder = sql.makeUpdate(table, keyValues, setValues) as UpdateBuilder
  const returning = (columns: Parameters<typeof sql.returning>[1]) => {
    const { statement, toSql } = sql.returning(builder, columns)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  builder.returning = returning
  return builder
}

function makeDelete(
  table: string,
  keyValues: Record<string, unknown>,
): DeleteBuilder {
  const builder = sql.makeDelete(table, keyValues) as DeleteBuilder
  const returning = (columns: Parameters<typeof sql.returning>[1]) => {
    const { statement, toSql } = sql.returning(builder, columns)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  builder.returning = returning
  return builder
}

function makeUpsert(
  table: string,
  insertValues: Record<string, unknown>,
  updateValues?: Record<string, unknown>,
): UpsertBuilder {
  const builder = sql.makeUpsert(table, insertValues, updateValues) as UpsertBuilder
  const returning = (columns: Parameters<typeof sql.returning>[1]) => {
    const { statement, toSql } = sql.returning(builder, columns)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  builder.returning = returning
  return builder
}

export { makeSelect, makeInsert, makeUpdate, makeDelete, makeUpsert }
export type { SqlBuilder, SelectBuilder, InsertBuilder, UpdateBuilder, DeleteBuilder, UpsertBuilder }
