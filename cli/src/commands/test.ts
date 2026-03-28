import { UnitTestRunFlags } from "@st-gr/abap-adt-api-patched"
import { getClient } from "../client"
import { output } from "../util/formatter"

export async function testCommand(
  objectUrl: string,
  options: {
    risk?: string
    duration?: string
    json?: boolean
  }
) {
  const client = await getClient()

  const flags: UnitTestRunFlags = {
    harmless: true,
    dangerous: false,
    critical: false,
    short: true,
    medium: false,
    long: false
  }

  // Parse risk level
  if (options.risk) {
    const risks = options.risk.split(",")
    flags.harmless = risks.includes("harmless")
    flags.dangerous = risks.includes("dangerous")
    flags.critical = risks.includes("critical")
    // If user specifies a level, include all levels up to it
    if (risks.includes("critical")) {
      flags.harmless = true
      flags.dangerous = true
      flags.critical = true
    } else if (risks.includes("dangerous")) {
      flags.harmless = true
      flags.dangerous = true
    }
  }

  // Parse duration
  if (options.duration) {
    const durations = options.duration.split(",")
    flags.short = durations.includes("short")
    flags.medium = durations.includes("medium")
    flags.long = durations.includes("long")
    if (durations.includes("long")) {
      flags.short = true
      flags.medium = true
      flags.long = true
    } else if (durations.includes("medium")) {
      flags.short = true
      flags.medium = true
    }
  }

  const classes = await client.unitTestRun(objectUrl, flags)

  if (options.json) {
    output(classes, true)
    return
  }

  if (classes.length === 0) {
    console.log("No test classes found.")
    return
  }

  let totalMethods = 0
  let passedMethods = 0
  let failedMethods = 0

  for (const cls of classes) {
    console.log(`\nTest Class: ${cls["adtcore:name"]}`)
    console.log(`  Risk: ${cls.riskLevel}, Duration: ${cls.durationCategory}`)

    if (cls.alerts && cls.alerts.length > 0) {
      for (const alert of cls.alerts) {
        console.log(`  [${alert.severity}] ${alert.kind}: ${alert.title}`)
        for (const detail of alert.details) {
          console.log(`    ${detail}`)
        }
      }
    }

    for (const method of cls.testmethods) {
      totalMethods++
      const hasAlerts = method.alerts && method.alerts.length > 0
      const status = hasAlerts ? "FAILED" : "PASSED"
      if (hasAlerts) failedMethods++
      else passedMethods++

      console.log(`  ${status} ${method["adtcore:name"]} (${method.executionTime}ms)`)

      if (hasAlerts) {
        for (const alert of method.alerts) {
          console.log(`    [${alert.severity}] ${alert.kind}: ${alert.title}`)
          for (const detail of alert.details) {
            console.log(`      ${detail}`)
          }
          if (alert.stack && alert.stack.length > 0) {
            console.log(`    Stack:`)
            for (const entry of alert.stack) {
              console.log(`      ${entry["adtcore:name"]} ${entry["adtcore:description"]}`)
            }
          }
        }
      }
    }
  }

  console.log(`\n--- Summary: ${totalMethods} tests, ${passedMethods} passed, ${failedMethods} failed ---`)
  if (failedMethods > 0) process.exit(1)
}
