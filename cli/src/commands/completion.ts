import * as fs from "fs"
import { getStatelessClient } from "../client"

export async function completionCommand(
  sourceUrl: string,
  options: {
    sourceFile: string
    line: string
    column: string
    json?: boolean
  }
) {
  const client = await getStatelessClient()

  const source = fs.readFileSync(options.sourceFile, "utf-8")
  const line = parseInt(options.line)
  const column = parseInt(options.column)

  const proposals = await client.codeCompletion(sourceUrl, source, line, column)

  if (options.json) {
    console.log(JSON.stringify(proposals, null, 2))
    return
  }

  if (proposals.length === 0) {
    console.log("No completions available.")
    return
  }

  console.log(`${proposals.length} completion(s):\n`)
  for (const p of proposals) {
    console.log(`  ${p.IDENTIFIER}`)
  }
}
