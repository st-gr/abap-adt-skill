import * as fs from "fs"
import { ADTClient } from "@st-gr/abap-adt-api-patched"
import { getClient } from "../client"
import { output } from "../util/formatter"

export async function syntaxCheckCommand(
  objectUrl: string,
  options: { sourceFile: string; mainUrl?: string; mainProgram?: string; json?: boolean }
) {
  const client = await getClient()

  const source = fs.readFileSync(options.sourceFile, "utf-8")

  // Resolve source URL and main URL
  let sourceUrl = objectUrl
  let mainUrl = options.mainUrl || objectUrl

  if (!objectUrl.includes("/source/")) {
    const struct = await client.objectStructure(objectUrl)
    sourceUrl = ADTClient.mainInclude(struct)
    mainUrl = options.mainUrl || sourceUrl
  }

  const results = await client.syntaxCheck(
    sourceUrl,
    mainUrl,
    source,
    options.mainProgram || "",
    "active"
  )

  if (options.json) {
    output(results, true)
    return
  }

  if (results.length === 0) {
    console.log("Syntax check: OK (no errors)")
    return
  }

  let hasErrors = false
  for (const msg of results) {
    const severity = msg.severity || "W"
    if (severity === "E" || severity === "A") hasErrors = true
    const line = msg.line || ""
    const offset = msg.offset || ""
    const loc = line ? ` (line ${line}:${offset})` : ""
    console.log(`[${severity}]${loc} ${msg.text}`)
    if (msg.uri) console.log(`  URI: ${msg.uri}`)
  }

  if (hasErrors) process.exit(1)
}
