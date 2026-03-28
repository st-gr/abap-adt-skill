import { getStatelessClient } from "../client"

export async function runCommand(
  className: string,
  options: { json?: boolean }
) {
  const client = await getStatelessClient()
  const raw = await client.runClass(className)
  // ADT classrun returns double newlines between lines — collapse to single
  const output = raw.replace(/\n{2,}/g, "\n").trim()

  if (options.json) {
    console.log(JSON.stringify({ className: className.toUpperCase(), output }))
  } else {
    console.log(output)
  }
}
