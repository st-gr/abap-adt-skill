import { getClient } from "../client"
import { output } from "../util/formatter"

export async function atcRunCommand(
  objectUrl: string,
  options: { variant?: string; max?: string; json?: boolean }
) {
  const client = await getClient()

  const variant = options.variant || "DEFAULT"
  const maxResults = options.max ? parseInt(options.max, 10) : undefined

  // Create ATC run
  const runResult = await client.createAtcRun(variant, objectUrl, maxResults)

  // Get worklist
  const worklist = await client.atcWorklists(runResult.id)

  if (options.json) {
    output(worklist, true)
    return
  }

  if (!worklist.objects || worklist.objects.length === 0) {
    console.log("ATC check: No findings.")
    return
  }

  console.log(`ATC Run ID: ${runResult.id}`)
  console.log(`Timestamp: ${worklist.timestamp || ""}`)
  console.log()

  for (const obj of worklist.objects) {
    console.log(`Object: ${obj.name} (${obj.type})`)
    if (obj.findings) {
      for (const finding of obj.findings) {
        const prio = finding.priority || ""
        const check = finding.checkId || ""
        const msg = finding.messageTitle || ""
        const loc = finding.location ? ` at ${finding.location.uri}` : ""
        console.log(`  [P${prio}] ${check}: ${msg}${loc}`)
        if (finding.uri) console.log(`    URI: ${finding.uri}`)
      }
    }
  }
}
