import * as fs from "fs"
import * as path from "path"
import * as readline from "readline"
import { ADTClient, createSSLConfig } from "@st-gr/abap-adt-api-patched"
import { findLandscapeFile, parseLandscape, resolveHostnameFQDN, SAPSystem } from "../util/landscape"
import { assertPrivateHost, probePort } from "../util/network"
import { encryptDPAPI, decryptDPAPI, isWindows } from "../util/credentials"

/** Single connection entry */
export interface AdtConnection {
  url: string
  client: string
  language: string
  allowSelfSigned: boolean
  user?: string
  encryptedPassword?: string
}

/** On-disk store: values are DPAPI-encrypted blobs (string) or plain objects (legacy/non-Windows) */
interface AdtConnectionStore {
  active: string
  connections: Record<string, string | AdtConnection>
}

function getConnectionFilePath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || ""
  return path.join(home, ".sap", "adt-connection.json")
}

/** Decrypt a connection value — handles both encrypted (string) and plain (object) formats */
function decryptConnection(value: string | AdtConnection): AdtConnection | null {
  if (typeof value === "object") return value  // legacy unencrypted
  if (!isWindows()) return null  // can't decrypt on non-Windows
  try {
    return JSON.parse(decryptDPAPI(value)) as AdtConnection
  } catch {
    return null
  }
}

/** Encrypt a connection for storage (returns DPAPI blob on Windows, plain object otherwise) */
function encryptConnection(conn: AdtConnection): string | AdtConnection {
  if (!isWindows()) return conn  // no DPAPI — store plaintext
  try {
    return encryptDPAPI(JSON.stringify(conn))
  } catch {
    return conn  // fallback to plaintext
  }
}

function loadStore(): AdtConnectionStore {
  try {
    const raw = JSON.parse(fs.readFileSync(getConnectionFilePath(), "utf-8"))
    // Migrate old single-connection format (pre-multi-connection)
    if (raw.url && !raw.connections) {
      const conn = raw as AdtConnection
      const key = guessKeyFromUrl(conn)
      const store: AdtConnectionStore = { active: key, connections: { [key]: encryptConnection(conn) } }
      saveStore(store)  // persist migration
      return store
    }
    // Migrate any plain-object entries to encrypted
    const store = raw as AdtConnectionStore
    let migrated = false
    for (const [key, value] of Object.entries(store.connections)) {
      if (typeof value === "object") {
        store.connections[key] = encryptConnection(value as AdtConnection)
        migrated = true
      }
    }
    if (migrated) saveStore(store)
    return store
  } catch {
    return { active: "", connections: {} }
  }
}

function saveStore(store: AdtConnectionStore): void {
  const filePath = getConnectionFilePath()
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2))
}

function guessKeyFromUrl(conn: AdtConnection): string {
  const host = new URL(conn.url).hostname.split(".")[0].toUpperCase()
  return conn.client ? `${host}/${conn.client}` : host
}

/** Make a connection key from SID + client */
export function connectionKey(sid: string, client: string): string {
  return client ? `${sid.toUpperCase()}/${client}` : sid.toUpperCase()
}

/** Save a connection under a key and set it as active */
export function saveConnection(key: string, conn: AdtConnection): void {
  const store = loadStore()
  store.connections[key] = encryptConnection(conn)
  store.active = key
  saveStore(store)
}

/** Load the active connection */
export function loadConnection(): AdtConnection | null {
  const store = loadStore()
  if (!store.active) return null
  const value = store.connections[store.active]
  if (!value) return null
  return decryptConnection(value)
}

/** Load a specific connection by key */
export function loadConnectionByKey(key: string): AdtConnection | null {
  const store = loadStore()
  const value = store.connections[key]
  if (!value) return null
  return decryptConnection(value)
}

/** Set a different connection as active */
export function setActiveConnection(key: string): boolean {
  const store = loadStore()
  if (!store.connections[key]) return false
  store.active = key
  saveStore(store)
  return true
}

/** List all stored connections (decrypts each entry) */
export function listConnections(): { key: string; conn: AdtConnection | null; active: boolean }[] {
  const store = loadStore()
  return Object.entries(store.connections).map(([key, value]) => ({
    key,
    conn: decryptConnection(value),
    active: key === store.active,
  }))
}

type ShellType = "bash" | "powershell" | "cmd"

function detectShell(): ShellType {
  const shell = (process.env.SHELL || process.env.ComSpec || "").toLowerCase()
  if (shell.includes("bash") || shell.includes("zsh") || process.env.MSYSTEM) return "bash"
  if (shell.includes("powershell") || shell.includes("pwsh") || process.env.PSModulePath) return "powershell"
  return "cmd"
}

function envSetSyntax(shell: ShellType, name: string, value: string): string {
  switch (shell) {
    case "bash": return `export ${name}="${value}"`
    case "powershell": return `$env:${name} = "${value}"`
    case "cmd": return `set ${name}=${value}`
  }
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length)
}

function printTable(systems: SAPSystem[], showUrls: boolean) {
  if (systems.length === 0) {
    console.log("No systems found.")
    return
  }

  if (showUrls) {
    const hSid = "SID", hServer = "Server", hHttp = "HTTP URL", hName = "Name"
    const wSid = Math.max(hSid.length, ...systems.map(s => s.sid.length))
    const wServer = Math.max(hServer.length, ...systems.map(s => s.server.length))
    const wHttp = Math.max(hHttp.length, ...systems.map(s => s.httpUrl.length))

    console.log(`${padRight(hSid, wSid)} | ${padRight(hServer, wServer)} | ${padRight(hHttp, wHttp)} | ${hName}`)
    console.log(`${"-".repeat(wSid)}-+-${"-".repeat(wServer)}-+-${"-".repeat(wHttp)}-+-${"-".repeat(40)}`)
    for (const s of systems) {
      console.log(`${padRight(s.sid, wSid)} | ${padRight(s.server, wServer)} | ${padRight(s.httpUrl, wHttp)} | ${s.name}`)
    }
  } else {
    const hSid = "SID", hServer = "Server", hName = "Name"
    const wSid = Math.max(hSid.length, ...systems.map(s => s.sid.length))
    const wServer = Math.max(hServer.length, ...systems.map(s => s.server.length))

    console.log(`${padRight(hSid, wSid)} | ${padRight(hServer, wServer)} | ${hName}`)
    console.log(`${"-".repeat(wSid)}-+-${"-".repeat(wServer)}-+-${"-".repeat(40)}`)
    for (const s of systems) {
      console.log(`${padRight(s.sid, wSid)} | ${padRight(s.server, wServer)} | ${s.name}`)
    }
  }
}

export async function systemsListCommand(options: { landscape?: string; urls?: boolean }) {
  const file = findLandscapeFile(options.landscape)
  const systems = parseLandscape(file)
  console.log(`Landscape: ${file} (${systems.length} systems)\n`)
  printTable(systems, !!options.urls)
}

export async function systemsSearchCommand(query: string, options: { landscape?: string }) {
  const file = findLandscapeFile(options.landscape)
  const systems = parseLandscape(file)
  const q = query.toUpperCase()
  const filtered = systems.filter(
    s => s.sid.toUpperCase().includes(q) || s.name.toUpperCase().includes(q)
  )
  printTable(filtered, true)
}

export function systemsStatusCommand() {
  const all = listConnections()
  if (all.length === 0) {
    console.log("No stored connections.")
    console.log("Run 'abap-adt systems connect <SID> [client]' to connect.")
    return
  }

  // Show all connections summary
  console.log("Stored connections:\n")
  for (const { key, conn, active } of all) {
    const marker = active ? " *" : "  "
    if (!conn) {
      console.log(`${marker} ${padRight(key, 12)} (decrypt failed)`)
      continue
    }
    const proto = conn.url.startsWith("https://") ? "HTTPS" : "HTTP"
    const cred = conn.encryptedPassword ? "DPAPI" : "no pwd"
    console.log(`${marker} ${padRight(key, 12)} ${padRight(proto, 5)} ${padRight(conn.user || "-", 12)} ${padRight(cred, 7)} ${conn.url}`)
  }

  // Show active connection details
  const conn = loadConnection()
  if (conn) {
    const isHttps = conn.url.startsWith("https://")
    console.log(`\nActive: ${all.find(c => c.active)?.key}`)
    console.log(`URL:         ${conn.url}`)
    console.log(`Client:      ${conn.client || "(default)"}`)
    console.log(`Language:    ${conn.language}`)
    console.log(`HTTPS:       ${isHttps ? "yes" : "no"}`)
    console.log(`Self-signed: ${conn.allowSelfSigned ? "yes" : "no"}`)
    console.log(`User:        ${conn.user || "(not stored — defaults to OS username)"}`)
    console.log(`Password:    ${conn.encryptedPassword ? "stored (DPAPI-encrypted)" : "not stored (set ADT_PASS)"}`)
  }
}

export function systemsSwitchCommand(key: string) {
  // Try exact match first
  if (setActiveConnection(key)) {
    console.log(`Switched to ${key}`)
    return
  }

  // Try case-insensitive / partial match (e.g. "se1" matches "SE1/600")
  const all = listConnections()
  const upper = key.toUpperCase()
  const matches = all.filter(c => c.key.toUpperCase().startsWith(upper))

  if (matches.length === 1) {
    setActiveConnection(matches[0].key)
    console.log(`Switched to ${matches[0].key}`)
  } else if (matches.length > 1) {
    console.error(`Ambiguous key '${key}'. Matches:`)
    for (const m of matches) {
      console.error(`  ${m.key}`)
    }
    process.exit(1)
  } else {
    console.error(`No connection found for '${key}'.`)
    console.error(`Stored: ${all.map(c => c.key).join(", ") || "(none)"}`)
    process.exit(1)
  }
}

export function systemsRemoveCommand(key: string) {
  const store = loadStore()
  // Try exact match
  let matchedKey = Object.keys(store.connections).find(k => k === key)
  // Try case-insensitive
  if (!matchedKey) {
    const upper = key.toUpperCase()
    matchedKey = Object.keys(store.connections).find(k => k.toUpperCase() === upper)
  }
  if (!matchedKey) {
    console.error(`No connection found for '${key}'.`)
    process.exit(1)
  }
  delete store.connections[matchedKey]
  if (store.active === matchedKey) {
    const remaining = Object.keys(store.connections)
    store.active = remaining.length > 0 ? remaining[0] : ""
  }
  saveStore(store)
  console.log(`Removed ${matchedKey}`)
}

export async function systemsConnectCommand(
  sid: string,
  clientArg: string | undefined,
  options: { landscape?: string; noHttps?: boolean; user?: string; password?: string }
) {
  const file = findLandscapeFile(options.landscape)
  const systems = parseLandscape(file)
  const matches = systems.filter(s => s.sid.toUpperCase() === sid.toUpperCase())

  if (matches.length === 0) {
    console.error(`No system found with SID: ${sid}`)
    console.error(`Use 'systems list' to see available systems.`)
    process.exit(1)
  }

  let selected: SAPSystem
  if (matches.length === 1) {
    selected = matches[0]
  } else {
    // Multiple entries — pick first by default, show options to stderr
    console.error(`Multiple entries for ${sid.toUpperCase()}:`)
    for (let i = 0; i < matches.length; i++) {
      console.error(`  ${i + 1}. ${matches[i].name} — ${matches[i].server}`)
    }

    if (process.stdin.isTTY) {
      const choice = await prompt(`Select [1]: `)
      const idx = parseInt(choice || "1", 10) - 1
      if (idx < 0 || idx >= matches.length) {
        console.error("Invalid selection.")
        process.exit(1)
      }
      selected = matches[idx]
    } else {
      console.error(`Using first entry (non-interactive mode).`)
      selected = matches[0]
    }
  }

  // Resolve short hostname to FQDN via DNS
  const fqdn = await resolveHostnameFQDN(selected.hostname)

  // VPN safety: verify hostname resolves to a private IP
  try {
    await assertPrivateHost(fqdn)
  } catch (err: any) {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  }

  // Gather credentials first (needed for HTTPURLLOC lookup)
  const client = clientArg || ""
  const defaultUser = (process.env.USERNAME || process.env.USER || "").toUpperCase()
  let user = options.user || ""
  let password = options.password || process.env.ADT_PASS || ""
  const shell = detectShell()

  if (process.stdin.isTTY && !user) {
    user = await prompt(`Username [${defaultUser}]: `) || defaultUser
  } else if (!user) {
    user = defaultUser
  }

  if (process.stdin.isTTY && !password) {
    password = await promptHidden("Password: ")
  }

  if (!password) {
    console.error("Error: No password. Set ADT_PASS in your shell before launching Claude:")
    console.error(`  ${envSetSyntax(shell, "ADT_PASS", "<your_password>")}`)
    process.exit(1)
  }

  // Connect via HTTP and discover HTTPS from HTTPURLLOC
  const httpPort = `80${selected.instanceNr}`
  const httpUrl = `http://${fqdn}:${httpPort}`
  let url = httpUrl
  let useHttps = false

  if (!options.noHttps) {
    console.error(`Connecting via HTTP to discover HTTPS configuration...`)
    try {
      const adtClient = new ADTClient(httpUrl, user, password, client, "EN", createSSLConfig(true))
      await adtClient.login()

      // Query HTTPURLLOC for official HTTPS endpoint
      const result = await adtClient.tableContents("HTTPURLLOC", 10)
      const httpsRow = result.values.find(
        (row: any) => String(row.PROTOCOL || "").trim().toUpperCase() === "HTTPS"
      )
      if (httpsRow) {
        const httpsHost = String(httpsRow.HOST || "").trim().toLowerCase()
        const httpsPort = parseInt(String(httpsRow.PORT || "0").trim(), 10)

        if (httpsHost && httpsPort > 0) {
          console.error(`HTTPURLLOC: HTTPS at ${httpsHost}:${httpsPort} — probing...`)
          if (await probePort(httpsHost, httpsPort)) {
            url = httpsPort === 443 ? `https://${httpsHost}` : `https://${httpsHost}:${httpsPort}`
            useHttps = true
            console.error(`HTTPS verified — using secure connection`)
          } else {
            console.error(`HTTPS port ${httpsPort} not reachable — using HTTP`)
          }
        }
      } else {
        console.error(`No HTTPS configured in HTTPURLLOC — using HTTP`)
      }
    } catch (err: any) {
      const is401 = String(err.message).includes("401")
      if (is401) {
        console.error(`Authentication failed (401) — check password for ${sid.toUpperCase()}`)
        console.error(`HTTPS discovery skipped (cannot query HTTPURLLOC without valid credentials)`)
        console.error(`Using HTTP — re-run 'systems connect' with correct password to discover HTTPS`)
      } else {
        console.error(`HTTPURLLOC lookup failed: ${err.message}`)
        // TCP probe fallback — only for non-auth errors (timeout, connection refused)
        // Auth failures mean we can't verify which system owns the HTTPS port
        console.error(`Probing HTTPS ports on ${fqdn}...`)
        for (const port of [443, 8443]) {
          if (await probePort(fqdn, port)) {
            url = port === 443 ? `https://${fqdn}` : `https://${fqdn}:${port}`
            useHttps = true
            console.error(`HTTPS available on port ${port}`)
            break
          }
        }
        if (!useHttps) {
          console.error(`No HTTPS found — using HTTP`)
        }
      }
    }
  } else {
    console.error(`Using HTTP (--no-https specified)`)
  }

  // Save connection to ~/.sap/adt-connection.json
  const conn: AdtConnection = {
    url,
    client,
    language: "EN",
    allowSelfSigned: useHttps,
    user,
  }

  // Encrypt password with DPAPI on Windows
  if (isWindows()) {
    try {
      conn.encryptedPassword = encryptDPAPI(password)
      console.error(`Password encrypted with Windows DPAPI`)
    } catch (err: any) {
      console.error(`Warning: DPAPI encryption failed: ${err.message}`)
      console.error(`Password not stored — set ADT_PASS manually for subsequent commands`)
    }
  } else {
    console.error(`Warning: DPAPI not available (non-Windows). Password not stored.`)
  }

  const key = connectionKey(selected.sid, client)
  saveConnection(key, conn)

  console.log(`Connected: ${selected.sid} client ${client || "(default)"} @ ${url}`)
  console.log(`Connection saved to ~/.sap/adt-connection.json`)
  if (conn.encryptedPassword) {
    console.log(`Credentials: stored (DPAPI-encrypted, user: ${user})`)
  } else {
    console.log(`\nCredentials (set in your shell before using other commands):`)
    if (user !== defaultUser) {
      console.log(`  ${envSetSyntax(shell, "ADT_USER", user)}`)
    }
    console.log(`  ${envSetSyntax(shell, "ADT_PASS", "<your_password>")}`)
  }
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function promptHidden(question: string): Promise<string> {
  return new Promise(resolve => {
    process.stderr.write(question)
    const rl = readline.createInterface({ input: process.stdin, terminal: false })
    // Attempt to hide input on TTY
    if (process.stdin.isTTY) {
      (process.stdin as any).setRawMode(true)
    }
    let input = ""
    const onData = (ch: Buffer) => {
      const c = ch.toString()
      if (c === "\n" || c === "\r" || c === "\u0004") {
        if (process.stdin.isTTY) {
          (process.stdin as any).setRawMode(false)
        }
        process.stdin.removeListener("data", onData)
        process.stderr.write("\n")
        rl.close()
        resolve(input)
      } else if (c === "\u0003") {
        // Ctrl+C
        process.exit(1)
      } else if (c === "\u007f" || c === "\b") {
        // Backspace
        input = input.slice(0, -1)
      } else {
        input += c
      }
    }
    process.stdin.on("data", onData)
    process.stdin.resume()
  })
}
