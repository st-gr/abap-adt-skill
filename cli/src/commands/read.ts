import { ADTClient, isClassStructure, AbapClassStructure } from "@st-gr/abap-adt-api-patched"
import { getStatelessClient } from "../client"

export async function readCommand(
  objectUrl: string,
  options: { version?: string; include?: string }
) {
  const client = await getStatelessClient()

  let sourceUrl = objectUrl

  // If the URL doesn't look like a source URL, resolve it
  if (!objectUrl.includes("/source/")) {
    const struct = await client.objectStructure(objectUrl)

    if (options.include && isClassStructure(struct)) {
      const classStruct = struct as AbapClassStructure
      const includes = ADTClient.classIncludes(classStruct)
      const include = includes.get(options.include as any)
      if (include) {
        sourceUrl = include
      } else {
        console.error(`Include '${options.include}' not found. Available: ${Array.from(includes.keys()).join(", ")}`)
        process.exit(1)
      }
    } else {
      sourceUrl = ADTClient.mainInclude(struct)
    }
  }

  const version = options.version as any
  const source = await client.getObjectSource(sourceUrl, version ? { version } : undefined)
  console.log(source)
}
