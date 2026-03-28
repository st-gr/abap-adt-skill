import { ADTClient, createSSLConfig, session_types } from "@st-gr/abap-adt-api-patched"
import { assertPrivateHost } from "./util/network"
import { loadConnection } from "./commands/systems"
import { decryptDPAPI, isWindows } from "./util/credentials"

let client: ADTClient | undefined
let statelessClient: ADTClient | undefined

export async function getStatelessClient(): Promise<ADTClient> {
  if (statelessClient) return statelessClient
  const c = await getClient()
  statelessClient = c.statelessClone
  return statelessClient
}

export async function getClient(): Promise<ADTClient> {
  if (client) return client

  // Load connection: env vars take precedence, then fall back to ~/.sap/adt-connection.json
  const conn = loadConnection()

  const url = process.env.ADT_URL || conn?.url || ""
  const defaultUser = (process.env.USERNAME || process.env.USER || "").toUpperCase()
  const user = process.env.ADT_USER || conn?.user || defaultUser
  let pass = process.env.ADT_PASS || ""
  const sapClient = process.env.ADT_CLIENT || conn?.client || ""
  const language = process.env.ADT_LANGUAGE || conn?.language || "EN"
  const allowSelfSigned = process.env.ADT_ALLOW_SELF_SIGNED !== undefined
    ? process.env.ADT_ALLOW_SELF_SIGNED !== "false"
    : conn?.allowSelfSigned ?? true

  // Decrypt stored password if no ADT_PASS env var
  if (!pass && conn?.encryptedPassword && isWindows()) {
    try {
      pass = decryptDPAPI(conn.encryptedPassword)
    } catch (err: any) {
      console.error(`Warning: Failed to decrypt stored password: ${err.message}`)
    }
  }

  if (!url || !user) {
    console.error(`Error: No connection configured.`)
    console.error(`Run 'abap-adt systems connect <SID> [client]' first, or set ADT_URL + ADT_USER env vars.`)
    process.exit(1)
  }
  if (!pass) {
    const shell = (process.env.SHELL || process.env.ComSpec || "").toLowerCase()
    const isPosh = shell.includes("powershell") || shell.includes("pwsh") || !!process.env.PSModulePath
    const isCmd = !isPosh && shell.includes("cmd")
    const example = isPosh ? '$env:ADT_PASS = "<your_password>"'
      : isCmd ? 'set ADT_PASS=<your_password>'
      : 'export ADT_PASS="<your_password>"'
    console.error(`Error: No password. Set ADT_PASS or run 'abap-adt systems connect' to store credentials.`)
    console.error(`  ${example}`)
    process.exit(1)
  }

  const options = allowSelfSigned ? createSSLConfig(true) : {}

  // VPN safety: verify private IP before sending credentials over HTTP
  if (url.startsWith("http://")) {
    const hostname = new URL(url).hostname
    await assertPrivateHost(hostname)
  }

  client = new ADTClient(url, user, pass, sapClient, language, options)
  await client.login()
  return client
}

export async function withStatefulSession<T>(
  fn: (client: ADTClient) => Promise<T>
): Promise<T> {
  const c = await getClient()
  c.stateful = session_types.stateful
  try {
    return await fn(c)
  } finally {
    c.stateful = session_types.stateless
    c.dropSession()
  }
}
