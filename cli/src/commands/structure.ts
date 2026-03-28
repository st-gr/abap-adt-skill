import { ADTClient, isClassStructure, AbapClassStructure } from "@st-gr/abap-adt-api-patched"
import { getStatelessClient } from "../client"
import { output } from "../util/formatter"

export async function structureCommand(
  objectUrl: string,
  options: { json?: boolean }
) {
  const client = await getStatelessClient()
  const struct = await client.objectStructure(objectUrl)

  if (options.json) {
    output(struct, true)
    return
  }

  const meta = struct.metaData
  console.log(`Object: ${meta["adtcore:name"]}`)
  console.log(`Type: ${meta["adtcore:type"]}`)
  console.log(`Description: ${meta["adtcore:description"] || ""}`)
  console.log(`Package: ${meta["adtcore:responsible"] || ""}`)
  console.log(`URI: ${struct.objectUrl}`)

  // Source URI
  const mainInclude = ADTClient.mainInclude(struct)
  console.log(`Source URI: ${mainInclude}`)

  // For classes, list includes
  if (isClassStructure(struct)) {
    const classStruct = struct as AbapClassStructure
    console.log("\nClass Includes:")
    const includes = ADTClient.classIncludes(classStruct)
    for (const [type, uri] of includes) {
      console.log(`  ${type}: ${uri}`)
    }
  }

  // Links
  if (struct.links && struct.links.length > 0) {
    console.log("\nLinks:")
    for (const link of struct.links) {
      console.log(`  [${link.rel || ""}] ${link.href} (${link.type || ""})`)
    }
  }
}
