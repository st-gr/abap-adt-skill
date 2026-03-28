import { getStatelessClient } from "../client"

export async function packageContentsCommand(
  packageName: string,
  options: { json?: boolean }
) {
  const client = await getStatelessClient()
  const result = await client.nodeContents("DEVC/K", packageName.toUpperCase())

  if (options.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (result.nodes.length === 0) {
    console.log(`Package ${packageName.toUpperCase()} is empty or not found.`)
    return
  }

  console.log(`Package ${packageName.toUpperCase()} — ${result.nodes.length} object(s):\n`)
  for (const node of result.nodes) {
    const desc = node.DESCRIPTION ? `  ${node.DESCRIPTION}` : ""
    console.log(`  ${padRight(node.OBJECT_TYPE, 10)} ${padRight(node.OBJECT_NAME, 30)}${desc}`)
  }
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s : s + " ".repeat(len - s.length)
}
