import * as fs from "fs"
import { getStatelessClient } from "../client"

export async function prettyPrintCommand(
  options: { sourceFile: string; output?: string }
) {
  const client = await getStatelessClient()

  const source = fs.readFileSync(options.sourceFile, "utf-8")
  const formatted = await client.prettyPrinter(source)

  // Sanity check: warn if output length differs >20% from input (guards against server bugs)
  if (source.length > 0) {
    const ratio = Math.abs(formatted.length - source.length) / source.length
    if (ratio > 0.2) {
      console.error(`Warning: Formatted output differs by ${Math.round(ratio * 100)}% in length from input — review carefully.`)
    }
  }

  if (options.output) {
    fs.writeFileSync(options.output, formatted, "utf-8")
    console.log(`Formatted source written to: ${options.output}`)
  } else {
    console.log(formatted)
  }
}
