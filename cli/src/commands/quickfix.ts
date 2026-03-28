import * as fs from "fs"
import { getStatelessClient } from "../client"

export async function quickfixCommand(
  objectUrl: string,
  options: {
    sourceFile: string
    line: string
    column: string
    apply?: string
    json?: boolean
  }
) {
  const client = await getStatelessClient()

  const source = fs.readFileSync(options.sourceFile, "utf-8")
  const line = parseInt(options.line)
  const column = parseInt(options.column)

  const proposals = await client.fixProposals(objectUrl, source, line, column)

  if (options.apply !== undefined) {
    const idx = parseInt(options.apply)
    if (idx < 0 || idx >= proposals.length) {
      console.error(`Error: Index ${idx} out of range (0..${proposals.length - 1})`)
      process.exit(1)
    }
    const deltas = await client.fixEdits(proposals[idx], source)
    if (options.json) {
      console.log(JSON.stringify(deltas, null, 2))
    } else {
      for (const d of deltas) {
        console.log(`${d.uri} [${d.range.start.line}:${d.range.start.column}–${d.range.end.line}:${d.range.end.column}]`)
        if (d.content) console.log(`  → ${d.content}`)
      }
    }
    return
  }

  if (options.json) {
    console.log(JSON.stringify(proposals, null, 2))
    return
  }

  if (proposals.length === 0) {
    console.log("No fix proposals available.")
    return
  }

  console.log(`${proposals.length} fix proposal(s):\n`)
  for (let i = 0; i < proposals.length; i++) {
    const p = proposals[i]
    console.log(`  [${i}] ${p["adtcore:name"]} — ${p["adtcore:description"] || ""}`)
  }
  console.log(`\nUse --apply <index> to apply a fix.`)
}
