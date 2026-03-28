import * as fs from "fs"
import { getStatelessClient } from "../client"

export async function definitionCommand(
  objectUrl: string,
  options: {
    line: string
    startCol: string
    endCol: string
    sourceFile?: string
    implementation?: boolean
    mainProgram?: string
    json?: boolean
  }
) {
  const client = await getStatelessClient()

  const line = parseInt(options.line)
  const startCol = parseInt(options.startCol)
  const endCol = parseInt(options.endCol)

  // Source body is needed for the API — read from file or fetch from server
  let source: string
  if (options.sourceFile) {
    source = fs.readFileSync(options.sourceFile, "utf-8")
  } else {
    source = await client.getObjectSource(objectUrl)
  }

  const result = await client.findDefinition(
    objectUrl,
    source,
    line,
    startCol,
    endCol,
    options.implementation || false,
    options.mainProgram || ""
  )

  if (options.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (!result.url) {
    console.log("No definition found.")
    return
  }

  console.log(`URI: ${result.url}`)
  if (result.line) console.log(`Line: ${result.line}`)
  if (result.column) console.log(`Column: ${result.column}`)
}
