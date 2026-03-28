import * as fs from "fs"
import * as crypto from "crypto"
import { ADTClient } from "@st-gr/abap-adt-api-patched"
import { getClient, withStatefulSession } from "../client"

export async function execCommand(
  options: { sourceFile?: string; code?: string; json?: boolean }
) {
  let userCode: string
  if (options.sourceFile) {
    userCode = fs.readFileSync(options.sourceFile, "utf-8")
  } else if (options.code) {
    userCode = options.code
  } else {
    console.error("Error: Provide --source-file or --code")
    process.exit(1)
  }

  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase()
  const className = `ZCL_EXEC_${suffix}`
  const classUrl = `/sap/bc/adt/oo/classes/${className.toLowerCase()}`

  const source = `CLASS ${className} DEFINITION PUBLIC CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.
ENDCLASS.

CLASS ${className} IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
    ${userCode}
  ENDMETHOD.
ENDCLASS.`

  const client = await getClient()
  // Use stateless clone for non-session operations (createObject/activate leave backend in weird state otherwise)
  const sc = client.statelessClone

  try {
    // Create temp class in $TMP
    await sc.createObject(
      "CLAS/OC",
      className,
      "$TMP",
      "Temp exec",
      "/sap/bc/adt/packages/%24tmp",
      "",
      ""
    )

    // Write source — resolve source URL via object structure
    const struct = await sc.objectStructure(classUrl)
    const sourceUrl = ADTClient.mainInclude(struct)
    await withStatefulSession(async c => {
      const lock = await c.lock(classUrl)
      try {
        await c.setObjectSource(sourceUrl, source, lock.LOCK_HANDLE)
      } finally {
        await c.unLock(classUrl, lock.LOCK_HANDLE)
      }
    })

    // Activate
    const actResult = await sc.activate(className, classUrl)
    if (!actResult.success) {
      const msgs = (actResult.messages || []).map((m: any) => m.shortText || "").join("; ")
      throw new Error(`Activation failed: ${msgs || "unknown error"}`)
    }

    // Run
    const raw = await sc.runClass(className)
    const output = raw.replace(/\n{2,}/g, "\n").trim()

    if (options.json) {
      console.log(JSON.stringify({ className, output }))
    } else {
      console.log(output)
    }
  } finally {
    // Best-effort cleanup: delete temp class
    try {
      await withStatefulSession(async c => {
        const lock = await c.lock(classUrl)
        await c.deleteObject(classUrl, lock.LOCK_HANDLE)
      })
    } catch {
      console.error(`Warning: Could not delete temp class ${className} — clean up manually in $TMP`)
    }
  }
}
