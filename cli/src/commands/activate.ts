import { getClient } from "../client"
import { output } from "../util/formatter"

export async function activateCommand(
  objectName: string,
  objectUrl: string,
  options: { json?: boolean }
) {
  const client = await getClient()
  const result = await client.activate(objectName, objectUrl)

  if (options.json) {
    output(result, true)
    return
  }

  if (result.success) {
    console.log(`Activation successful: ${objectName}`)
  } else {
    console.log(`Activation failed: ${objectName}`)
  }

  if (result.messages && result.messages.length > 0) {
    console.log("\nMessages:")
    for (const msg of result.messages) {
      const severity = msg.type || "I"
      const line = msg.line ? `:${msg.line}` : ""
      console.log(`  [${severity}]${line} ${msg.shortText}`)
      if (msg.href) console.log(`        ${msg.href}`)
    }
  }

  if (result.inactive && result.inactive.length > 0) {
    console.log("\nRemaining inactive objects:")
    for (const obj of result.inactive) {
      if (obj.object) {
        console.log(`  ${obj.object["adtcore:name"]} (${obj.object["adtcore:type"]})`)
      }
    }
  }

  if (!result.success) process.exit(1)
}

export async function inactiveObjectsCommand(options: { json?: boolean }) {
  const client = await getClient()
  const objects = await client.inactiveObjects()

  if (options.json) {
    output(objects, true)
    return
  }

  if (objects.length === 0) {
    console.log("No inactive objects.")
    return
  }

  console.log("Inactive objects:")
  for (const record of objects) {
    if (record.object) {
      console.log(`  ${record.object["adtcore:name"]} (${record.object["adtcore:type"]}) - ${record.object["adtcore:uri"]}`)
    }
  }
}
