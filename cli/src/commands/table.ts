import { getStatelessClient } from "../client"
import { formatTable, output } from "../util/formatter"

export async function tableCommand(
  tableName: string,
  options: { rows?: string; json?: boolean }
) {
  const client = await getStatelessClient()
  const maxRows = options.rows ? parseInt(options.rows, 10) : 100
  const result = await client.tableContents(tableName.toUpperCase(), maxRows)

  if (options.json) {
    output(result, true)
    return
  }

  if (!result.columns || result.columns.length === 0) {
    console.log("No data returned.")
    return
  }

  console.log(`Table: ${tableName.toUpperCase()}`)
  console.log(`Rows returned: ${result.values.length}`)
  console.log()

  const cols = result.columns.map(c => c.name)
  const rows = result.values.map((row: any) => {
    const r: Record<string, string> = {}
    for (const col of cols) {
      r[col] = String(row[col] ?? "")
    }
    return r
  })

  if (rows.length > 0) {
    console.log(formatTable(rows, cols))
  } else {
    console.log("(empty)")
  }
}

export async function sqlCommand(
  query: string,
  options: { rows?: string; json?: boolean }
) {
  const client = await getStatelessClient()
  const maxRows = options.rows ? parseInt(options.rows, 10) : 100
  const result = await client.runQuery(query, maxRows)

  if (options.json) {
    output(result, true)
    return
  }

  if (!result.columns || result.columns.length === 0) {
    console.log("No data returned.")
    return
  }

  const cols = result.columns.map(c => c.name)
  const rows = result.values.map((row: any) => {
    const r: Record<string, string> = {}
    for (const col of cols) {
      r[col] = String(row[col] ?? "")
    }
    return r
  })

  if (rows.length > 0) {
    console.log(formatTable(rows, cols))
  } else {
    console.log("(empty)")
  }
}
