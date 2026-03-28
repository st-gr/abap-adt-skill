import * as fs from "fs"
import { ADTClient, isClassStructure, AbapClassStructure } from "@st-gr/abap-adt-api-patched"
import { getClient, withStatefulSession } from "../client"

export async function writeCommand(
  objectUrl: string,
  options: { sourceFile: string; transport?: string }
) {
  if (!fs.existsSync(options.sourceFile)) {
    console.error(`Source file not found: ${options.sourceFile}`)
    process.exit(1)
  }
  const source = fs.readFileSync(options.sourceFile, "utf-8")

  // Resolve source URL and object URL BEFORE entering stateful session
  const client = await getClient()
  let sourceUrl = objectUrl
  let lockUrl = objectUrl
  let needsTestIncludeCreation = false
  let className = ""

  // Handle class includes (e.g. /sap/bc/adt/oo/classes/zcl_foo/includes/testclasses)
  const includeMatch = objectUrl.match(/^(\/sap\/bc\/adt\/oo\/classes\/([^/]+))\/includes\/(\w+)$/)
  if (includeMatch) {
    lockUrl = includeMatch[1]  // lock the class, not the include
    className = includeMatch[2]
    const includeName = includeMatch[3]

    // Check if this include already exists
    const struct = await client.statelessClone.objectStructure(lockUrl)
    if (isClassStructure(struct)) {
      const includes = ADTClient.classIncludes(struct as AbapClassStructure)
      const existing = includes.get(includeName as any)
      if (existing) {
        sourceUrl = existing
      } else if (includeName === "testclasses") {
        needsTestIncludeCreation = true
        sourceUrl = objectUrl
      } else {
        console.error(`Include '${includeName}' not found. Available: ${Array.from(includes.keys()).join(", ")}`)
        process.exit(1)
      }
    }
  } else if (!objectUrl.includes("/source/")) {
    const struct = await client.statelessClone.objectStructure(objectUrl)
    sourceUrl = ADTClient.mainInclude(struct)
  }

  await withStatefulSession(async c => {
    // Lock the OBJECT URL (not the source URL) — SAP ADT requires locking the object, not its source
    const lock = await c.lock(lockUrl)
    const lockHandle = lock.LOCK_HANDLE

    try {
      // Determine transport
      let transport = options.transport || lock.CORRNR
      if (!transport) {
        const info = await c.transportInfo(sourceUrl !== objectUrl ? sourceUrl : lockUrl)
        if (info.RECORDING && info.RECORDING !== " ") {
          if (info.TRANSPORTS && info.TRANSPORTS.length > 0) {
            transport = info.TRANSPORTS[0].TRKORR
            console.log(`Using transport: ${transport} (${info.TRANSPORTS[0].AS4TEXT})`)
          } else {
            console.error("Transport required but none available. Create one with: transport create")
            console.error(`Package: ${info.DEVCLASS}`)
            await c.unLock(lockUrl, lockHandle)
            process.exit(1)
          }
        }
      }

      // Create testclasses include if it doesn't exist yet
      if (needsTestIncludeCreation) {
        await c.createTestInclude(className, lockHandle, transport || "")
        // Re-read structure to get the actual source URI
        const struct = await c.objectStructure(lockUrl)
        if (isClassStructure(struct)) {
          const includes = ADTClient.classIncludes(struct as AbapClassStructure)
          const testUrl = includes.get("testclasses")
          if (testUrl) {
            sourceUrl = testUrl
          }
        }
      }

      // Write source to the SOURCE URL (with lock handle obtained from object lock)
      await c.setObjectSource(sourceUrl, source, lockHandle, transport || undefined)
      console.log(`Source written successfully to ${sourceUrl}`)
      if (transport) {
        console.log(`Transport: ${transport}`)
      }
    } finally {
      try {
        await c.unLock(lockUrl, lockHandle)
      } catch {
        // Ignore unlock errors
      }
    }
  })
}
