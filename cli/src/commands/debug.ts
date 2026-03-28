import * as crypto from "crypto"
import { DebuggingMode, isDebuggee, isDebugListenerError } from "@st-gr/abap-adt-api-patched"
import { getClient, withStatefulSession } from "../client"
import { output } from "../util/formatter"

function generateId(): string {
  return crypto.randomUUID().toUpperCase()
}

// Store debug session IDs in environment for continuity across CLI invocations
function getTerminalId(): string {
  return process.env.ADT_TERMINAL_ID || generateId()
}

function getIdeId(): string {
  return process.env.ADT_IDE_ID || generateId()
}

export async function debugListenCommand(options: {
  mode?: string
  user?: string
  timeout?: string
  json?: boolean
}) {
  const mode = (options.mode || "user") as DebuggingMode
  const terminalId = getTerminalId()
  const ideId = getIdeId()

  console.error(`Terminal ID: ${terminalId}`)
  console.error(`IDE ID: ${ideId}`)
  console.error(`Mode: ${mode}`)
  console.error("Waiting for debuggee... (set a breakpoint in SAP and run the program)")

  await withStatefulSession(async client => {
    const user = options.user || client.username
    const result = await client.debuggerListen(mode, terminalId, ideId, user)

    if (!result) {
      console.log("No debuggee found (timeout or no breakpoint hit).")
      return
    }

    if (isDebugListenerError(result)) {
      console.error(`Debug listener error: ${result.message.text}`)
      if (result.conflictText) {
        console.error(`Conflict: ${result.conflictText}`)
      }
      process.exit(1)
    }

    if (isDebuggee(result)) {
      if (options.json) {
        output(result, true)
        return
      }
      console.log(`\nDebuggee found!`)
      console.log(`  Debuggee ID: ${result.DEBUGGEE_ID}`)
      console.log(`  User: ${result.DEBUGGEE_USER}`)
      console.log(`  Program: ${result.PRG_CURR}`)
      console.log(`  Include: ${result.INCL_CURR}`)
      console.log(`  Line: ${result.LINE_CURR}`)
      console.log(`  Terminal ID: ${terminalId}`)
      console.log(`  IDE ID: ${ideId}`)
      console.log(`\nTo attach: debug attach ${result.DEBUGGEE_ID} --terminal-id ${terminalId} --ide-id ${ideId}`)
    }
  })
}

export async function debugAttachCommand(
  debuggeeId: string,
  options: { mode?: string; user?: string; json?: boolean }
) {
  const mode = (options.mode || "user") as DebuggingMode

  await withStatefulSession(async client => {
    const user = options.user || client.username
    const result = await client.debuggerAttach(mode, debuggeeId, user)

    if (options.json) {
      output(result, true)
      return
    }

    console.log(`Attached to debuggee: ${debuggeeId}`)
    console.log(`  Session: ${result.debugSessionId}`)
    console.log(`  Stepping possible: ${result.isSteppingPossible}`)
    if (result.reachedBreakpoints && result.reachedBreakpoints.length > 0) {
      console.log(`  Reached breakpoints:`)
      for (const bp of result.reachedBreakpoints) {
        console.log(`    ${bp.id} (${bp.kind})`)
      }
    }
    console.log(`\nAvailable actions:`)
    for (const action of result.actions) {
      if (!action.disabled) {
        console.log(`  ${action.name}: ${action.title}`)
      }
    }
  })
}

export async function debugBreakpointsCommand(
  uri: string,
  options: {
    mode?: string
    user?: string
    terminalId?: string
    ideId?: string
    clientId?: string
    json?: boolean
  }
) {
  const mode = (options.mode || "user") as DebuggingMode
  const terminalId = options.terminalId || getTerminalId()
  const ideId = options.ideId || getIdeId()
  const clientId = options.clientId || generateId()

  const client = await getClient()
  const user = options.user || client.username
  const result = await client.debuggerSetBreakpoints(
    mode,
    terminalId,
    ideId,
    clientId,
    [uri],
    user
  )

  if (options.json) {
    output(result, true)
    return
  }

  for (const bp of result) {
    if ("uri" in bp) {
      console.log(`Breakpoint set: ${bp.id} at ${bp.uri.uri} (${bp.kind})`)
    } else if ("errorMessage" in bp) {
      console.error(`Breakpoint error: ${bp.errorMessage}`)
    }
  }
}

export async function debugStepCommand(
  stepType: string,
  options: { uri?: string; json?: boolean }
) {
  await withStatefulSession(async client => {
    const result = options.uri
      ? await client.debuggerStep(stepType as "stepRunToLine", options.uri)
      : await client.debuggerStep(stepType as "stepInto")

    if (options.json) {
      output(result, true)
      return
    }

    console.log(`Step: ${stepType}`)
    console.log(`  Session: ${result.debugSessionId}`)
    console.log(`  Stepping possible: ${result.isSteppingPossible}`)
    if (result.reachedBreakpoints && result.reachedBreakpoints.length > 0) {
      console.log(`  Reached breakpoints:`)
      for (const bp of result.reachedBreakpoints) {
        console.log(`    ${bp.id} (${bp.kind})`)
      }
    }
  })
}

export async function debugStackCommand(options: { json?: boolean }) {
  await withStatefulSession(async client => {
    const result = await client.debuggerStackTrace()

    if (options.json) {
      output(result, true)
      return
    }

    console.log(`Stack (RFC: ${result.isRfc}, Same system: ${result.isSameSystem}):`)
    for (const entry of result.stack) {
      if ("programName" in entry) {
        const prog = entry.programName
        const line = entry.line
        const event = "eventName" in entry ? entry.eventName : ""
        const pos = entry.stackPosition
        console.log(`  [${pos}] ${prog} line ${line} (${event})`)
      }
    }
  })
}

export async function debugVariablesCommand(
  variables: string[],
  options: { json?: boolean }
) {
  await withStatefulSession(async client => {
    const result = await client.debuggerVariables(variables)

    if (options.json) {
      output(result, true)
      return
    }

    for (const v of result) {
      const type = v.DECLARED_TYPE_NAME || v.TECHNICAL_TYPE
      const meta = v.META_TYPE
      console.log(`${v.NAME} = ${v.VALUE} (${type}, ${meta}, len=${v.LENGTH})`)
    }
  })
}

export async function debugChildVariablesCommand(
  parents: string[],
  options: { json?: boolean }
) {
  await withStatefulSession(async client => {
    const result = await client.debuggerChildVariables(parents)

    if (options.json) {
      output(result, true)
      return
    }

    if (result.hierarchies.length > 0) {
      console.log("Hierarchies:")
      for (const h of result.hierarchies) {
        console.log(`  ${h.PARENT_ID} -> ${h.CHILD_NAME} (${h.CHILD_ID})`)
      }
    }

    if (result.variables.length > 0) {
      console.log("\nVariables:")
      for (const v of result.variables) {
        const type = v.DECLARED_TYPE_NAME || v.TECHNICAL_TYPE
        console.log(`  ${v.NAME} = ${v.VALUE} (${type}, ${v.META_TYPE})`)
      }
    }
  })
}
