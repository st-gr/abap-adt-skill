import * as dns from "dns"
import * as net from "net"

/**
 * Check if an IP address is in a private/reserved range.
 * Private ranges: 10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x, fc00::/7, ::1
 */
export function isPrivateIP(ip: string): boolean {
  // IPv4
  const parts = ip.split(".")
  if (parts.length === 4) {
    const [a, b] = parts.map(Number)
    if (a === 10) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 127) return true
    if (a === 169 && b === 254) return true
    return false
  }
  // IPv6
  if (ip === "::1") return true
  if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd")) return true
  if (ip.toLowerCase().startsWith("fe80")) return true
  return false
}

/**
 * Verify that a hostname resolves to a private IP address.
 * Aborts with a clear error if DNS fails or the IP is public (VPN may be down).
 */
export async function assertPrivateHost(hostname: string): Promise<string> {
  let address: string
  try {
    const result = await dns.promises.lookup(hostname)
    address = result.address
  } catch (err: any) {
    if (err.code === "ENOTFOUND") {
      throw new Error(`Cannot resolve hostname '${hostname}' — check VPN connection.`)
    }
    throw new Error(`DNS lookup failed for '${hostname}': ${err.message}`)
  }

  if (!isPrivateIP(address)) {
    throw new Error(
      `Host '${hostname}' resolves to public IP ${address} — VPN may be down. ` +
      `Refusing to send credentials over an insecure connection.`
    )
  }

  return address
}

/**
 * TCP port probe — checks if a port is open without sending any HTTP traffic.
 */
export function probePort(hostname: string, port: number, timeoutMs = 3000): Promise<boolean> {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: hostname, port, timeout: timeoutMs })
    socket.once("connect", () => {
      socket.destroy()
      resolve(true)
    })
    socket.once("timeout", () => {
      socket.destroy()
      resolve(false)
    })
    socket.once("error", () => {
      socket.destroy()
      resolve(false)
    })
  })
}
