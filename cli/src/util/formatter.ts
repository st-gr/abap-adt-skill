export function formatTable(
  rows: Record<string, string>[],
  columns?: string[]
): string {
  if (rows.length === 0) return "(no results)"
  const cols = columns || Object.keys(rows[0])
  const widths = cols.map(c =>
    Math.max(c.length, ...rows.map(r => String(r[c] ?? "").length))
  )
  const header = cols.map((c, i) => c.padEnd(widths[i])).join(" | ")
  const separator = widths.map(w => "-".repeat(w)).join("-+-")
  const body = rows
    .map(r => cols.map((c, i) => String(r[c] ?? "").padEnd(widths[i])).join(" | "))
    .join("\n")
  return `${header}\n${separator}\n${body}`
}

export function output(data: unknown, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2))
  } else if (typeof data === "string") {
    console.log(data)
  } else {
    console.log(JSON.stringify(data, null, 2))
  }
}
