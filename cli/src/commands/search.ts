import { getStatelessClient } from "../client"
import { formatTable, output } from "../util/formatter"

export async function searchCommand(
  query: string,
  options: { type?: string; max?: string; json?: boolean }
) {
  const client = await getStatelessClient()
  const results = await client.searchObject(
    query,
    options.type,
    options.max ? parseInt(options.max, 10) : 100
  )
  if (options.json) {
    output(results, true)
    return
  }
  if (results.length === 0) {
    console.log("No objects found.")
    return
  }
  const rows = results.map(r => ({
    Name: r["adtcore:name"],
    Type: r["adtcore:type"],
    Package: r["adtcore:packageName"] || "",
    Description: r["adtcore:description"] || "",
    URI: r["adtcore:uri"]
  }))
  console.log(formatTable(rows))
}
