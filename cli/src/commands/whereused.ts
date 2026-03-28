import { getStatelessClient } from "../client"

export async function whereusedCommand(
  objectUrl: string,
  options: { line?: string; column?: string; json?: boolean }
) {
  const client = await getStatelessClient()
  const line = options.line ? parseInt(options.line) : undefined
  const column = options.column ? parseInt(options.column) : undefined

  const refs = await client.usageReferences(objectUrl, line, column)

  if (options.json) {
    console.log(JSON.stringify(refs, null, 2))
    return
  }

  if (refs.length === 0) {
    console.log("No references found.")
    return
  }

  console.log(`Found ${refs.length} reference(s):\n`)
  for (const ref of refs) {
    const name = ref["adtcore:name"] || ""
    const type = ref["adtcore:type"] || ""
    const uri = ref.uri || ""
    const pkg = ref.packageRef?.["adtcore:name"] || ""
    console.log(`  ${padRight(name, 30)} ${padRight(type, 12)} ${padRight(pkg, 16)} ${uri}`)
  }
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s : s + " ".repeat(len - s.length)
}
