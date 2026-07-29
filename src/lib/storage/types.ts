// The shared adapter mirrors node-postgres: callers may opt into a row type,
// while legacy call sites remain dynamically typed until their schemas migrate.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DatabaseQueryResult<T = any> {
  rows: T[]
  rowCount: number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DatabaseQuery = <T = any>(
  text: string,
  params?: unknown[],
) => Promise<DatabaseQueryResult<T>>

export type DatabaseTransaction = <T>(
  callback: (query: DatabaseQuery) => Promise<T>,
) => Promise<T>
