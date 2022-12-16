import * as sql from "./sql-builder.ts";

type SqlBuilder = sql.SqlBuilder

type SelectBuilder = SqlBuilder & {
  columns: (columns: Parameters<typeof sql.selection>[1], table?: string) => SelectBuilder 
  order: (columns: Parameters<typeof sql.order>[1], table?: string) => SelectBuilder 
  where: (columns: Parameters<typeof sql.where>[1]) => SelectBuilder 
}

function makeSelect(table: string, schema?: string): SelectBuilder {
  const builder = sql.makeSelect(table, schema) as SelectBuilder
  const columns = (columns: Parameters<typeof sql.selection>[1], table?: string) => {
    const { statement, toSql } = sql.selection(builder, columns, table)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  const order = (columns: Parameters<typeof sql.order>[1], table?: string) => {
    const { statement, toSql } = sql.order(builder, columns, table)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  const where = (columns: Parameters<typeof sql.where>[1]) => {
    const { statement, toSql } = sql.where(builder, columns)
    builder.statement = statement
    builder.toSql = toSql
    return builder
  }
  builder.columns = columns
  builder.order = order
  builder.where = where
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
