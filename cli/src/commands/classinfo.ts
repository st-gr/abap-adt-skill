import { getStatelessClient } from "../client"

interface ClassComponent {
  "adtcore:name": string
  "adtcore:type": string
  links: any[]
  components: ClassComponent[]
  [key: string]: any
}

export async function classinfoCommand(
  objectUrl: string,
  options: { json?: boolean }
) {
  const client = await getStatelessClient()
  const root = await client.classComponents(objectUrl) as ClassComponent

  if (options.json) {
    console.log(JSON.stringify(root, null, 2))
    return
  }

  printComponent(root, 0)
}

function printComponent(comp: ClassComponent, depth: number) {
  const indent = "  ".repeat(depth)
  const name = comp["adtcore:name"] || ""
  const type = comp["adtcore:type"] || ""
  const desc = comp["adtcore:description"] || ""
  const visibility = comp["abapsource:visibility"] || ""

  const parts = [name]
  if (type) parts.push(`(${type})`)
  if (visibility) parts.push(`[${visibility}]`)
  if (desc) parts.push(`— ${desc}`)

  console.log(`${indent}${parts.join(" ")}`)

  if (comp.components) {
    for (const child of comp.components) {
      printComponent(child, depth + 1)
    }
  }
}
