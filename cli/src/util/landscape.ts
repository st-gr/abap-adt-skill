import * as fs from "fs"
import * as path from "path"
import * as dns from "dns"

export interface SAPSystem {
  sid: string
  name: string
  server: string
  hostname: string
  instanceNr: string
  httpUrl: string
  httpsUrl: string
  uuid: string
}

export function findLandscapeFile(override?: string): string {
  if (override) {
    if (!fs.existsSync(override)) {
      throw new Error(`Landscape file not found: ${override}`)
    }
    return override
  }

  const candidates: string[] = []

  // Windows: %APPDATA%\SAP\Common\SAPUILandscape.xml
  const appdata = process.env.APPDATA
  if (appdata) {
    candidates.push(path.join(appdata, "SAP", "Common", "SAPUILandscape.xml"))
  }

  // Linux/Mac: ~/.sap/SAPUILandscape.xml
  const home = process.env.HOME || process.env.USERPROFILE
  if (home) {
    candidates.push(path.join(home, ".sap", "SAPUILandscape.xml"))
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  throw new Error(
    `SAPUILandscape.xml not found. Searched:\n${candidates.map(c => `  ${c}`).join("\n")}\nUse --landscape <path> to specify the file.`
  )
}

export function parseLandscape(filePath: string): SAPSystem[] {
  const xml = fs.readFileSync(filePath, "utf-8")
  const systems: SAPSystem[] = []

  // Parse <Service> elements with type="SAPGUI"
  const serviceRegex = /<Service\s[^>]*type="SAPGUI"[^>]*\/>/g
  let match: RegExpExecArray | null
  while ((match = serviceRegex.exec(xml)) !== null) {
    const tag = match[0]
    const sid = attr(tag, "systemid")
    const name = attr(tag, "name")
    const server = attr(tag, "server")
    const uuid = attr(tag, "uuid")

    if (!sid || !server) continue

    const [hostname, diagPort] = server.split(":")
    const instanceNr = diagPort ? diagPort.slice(-2) : "00"
    const httpPort = `80${instanceNr}`
    const httpsPort = `443${instanceNr}`

    systems.push({
      sid,
      name: name || sid,
      server,
      hostname,
      instanceNr,
      httpUrl: `http://${hostname}:${httpPort}`,
      httpsUrl: `https://${hostname}:${httpsPort}`,
      uuid: uuid || ""
    })
  }

  return systems.sort((a, b) => a.sid.localeCompare(b.sid))
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, "i"))
  return m ? m[1] : ""
}

/**
 * Resolve a short hostname (e.g. "sapdev01") to its FQDN (e.g. "sapdev01.corp.example.com")
 * via DNS forward + reverse lookup. The resolved FQDN gets baked into the URL
 * stored in ~/.sap/adt-connection.json, so reverse DNS only happens once per connect.
 * Falls back to the original hostname on failure.
 */
export async function resolveHostnameFQDN(hostname: string): Promise<string> {
  // Already looks fully qualified (has dots)
  if (hostname.includes(".")) return hostname

  try {
    const { address } = await dns.promises.lookup(hostname)
    const fqdns = await dns.promises.reverse(address)
    if (fqdns.length > 0) return fqdns[0]
  } catch {
    // DNS resolution failed — fall back to original
  }
  return hostname
}
