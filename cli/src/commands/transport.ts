import { getClient } from "../client"
import { output } from "../util/formatter"

export async function transportInfoCommand(
  objectUrl: string,
  options: { devclass?: string; json?: boolean }
) {
  const client = await getClient()
  const info = await client.transportInfo(objectUrl, options.devclass)

  if (options.json) {
    output(info, true)
    return
  }

  console.log(`Object: ${info.OBJECTNAME} (${info.OBJECT})`)
  console.log(`Package: ${info.DEVCLASS}`)
  console.log(`Operation: ${info.OPERATION}`)
  console.log(`Result: ${info.RESULT}`)
  console.log(`Recording: ${info.RECORDING}`)

  if (info.LOCKS) {
    console.log(`\nLocked by transport: ${info.LOCKS.HEADER.TRKORR}`)
    console.log(`  Owner: ${info.LOCKS.HEADER.AS4USER}`)
    console.log(`  Description: ${info.LOCKS.HEADER.AS4TEXT}`)
  }

  if (info.TRANSPORTS && info.TRANSPORTS.length > 0) {
    console.log("\nAvailable transports:")
    for (const t of info.TRANSPORTS) {
      console.log(`  ${t.TRKORR} - ${t.AS4TEXT} (${t.AS4USER}, ${t.TRSTATUS})`)
    }
  }
}

export async function transportCreateCommand(
  objectUrl: string,
  options: { description: string; devclass: string; json?: boolean }
) {
  const client = await getClient()
  const transport = await client.createTransport(
    objectUrl,
    options.description,
    options.devclass
  )

  if (options.json) {
    output({ transport }, true)
    return
  }

  console.log(`Transport created: ${transport}`)
}

export async function transportReleaseCommand(
  transportNumber: string,
  options: { ignoreLocks?: boolean; ignoreAtc?: boolean; json?: boolean }
) {
  const client = await getClient()
  const reports = await client.transportRelease(
    transportNumber,
    options.ignoreLocks || false,
    options.ignoreAtc || false
  )

  if (options.json) {
    output(reports, true)
    return
  }

  for (const report of reports) {
    console.log(`Reporter: ${report["chkrun:reporter"]}`)
    console.log(`Status: ${report["chkrun:status"]}`)
    console.log(`Status Text: ${report["chkrun:statusText"]}`)
    if (report.messages && report.messages.length > 0) {
      for (const msg of report.messages) {
        console.log(`  [${msg["chkrun:type"]}] ${msg["chkrun:shortText"]}`)
      }
    }
  }
}

export async function transportListCommand(
  options: { user?: string; json?: boolean }
) {
  const client = await getClient()
  const user = options.user || client.username
  const transports = await client.userTransports(user)

  if (options.json) {
    output(transports, true)
    return
  }

  const printRequests = (requests: any[], indent: string) => {
    for (const req of requests) {
      console.log(`${indent}${req["tm:number"]} - ${req["tm:desc"]} (${req["tm:owner"]}, ${req["tm:status"]})`)
      if (req.tasks) {
        for (const task of req.tasks) {
          console.log(`${indent}  Task: ${task["tm:number"]} - ${task["tm:desc"]} (${task["tm:owner"]})`)
        }
      }
    }
  }

  for (const target of transports.workbench) {
    console.log(`\nWorkbench Target: ${target["tm:name"]} (${target["tm:desc"]})`)
    if (target.modifiable.length > 0) {
      console.log("  Modifiable:")
      printRequests(target.modifiable, "    ")
    }
    if (target.released.length > 0) {
      console.log("  Released:")
      printRequests(target.released, "    ")
    }
  }

  for (const target of transports.customizing) {
    console.log(`\nCustomizing Target: ${target["tm:name"]} (${target["tm:desc"]})`)
    if (target.modifiable.length > 0) {
      console.log("  Modifiable:")
      printRequests(target.modifiable, "    ")
    }
    if (target.released.length > 0) {
      console.log("  Released:")
      printRequests(target.released, "    ")
    }
  }
}

export async function transportDeleteCommand(
  transportNumber: string,
  options: { json?: boolean }
) {
  const client = await getClient()
  await client.transportDelete(transportNumber)

  if (options.json) {
    output({ deleted: transportNumber }, true)
    return
  }

  console.log(`Transport deleted: ${transportNumber}`)
}
