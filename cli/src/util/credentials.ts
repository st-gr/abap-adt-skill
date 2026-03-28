import { execSync } from "child_process"

export function isWindows(): boolean {
  return process.platform === "win32"
}

/**
 * Encrypt a plaintext string using Windows DPAPI via PowerShell.
 * The resulting blob is only decryptable by the same Windows user on the same machine.
 * Password is passed via environment variable to avoid appearing in process list.
 */
export function encryptDPAPI(plaintext: string): string {
  if (!isWindows()) {
    throw new Error("DPAPI encryption is only available on Windows")
  }

  const script = `ConvertFrom-SecureString (ConvertTo-SecureString -String $env:_DPAPI_INPUT -AsPlainText -Force)`

  const result = execSync(`powershell -NoProfile -Command "${script}"`, {
    env: { ...process.env, _DPAPI_INPUT: plaintext },
    encoding: "utf-8",
    windowsHide: true,
  })

  return result.trim()
}

/**
 * Decrypt a DPAPI-encrypted hex blob back to plaintext via PowerShell.
 * Only works for the same Windows user who encrypted it.
 */
export function decryptDPAPI(blob: string): string {
  if (!isWindows()) {
    throw new Error("DPAPI decryption is only available on Windows")
  }

  const script = `$s = $env:_DPAPI_INPUT | ConvertTo-SecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))`

  const result = execSync(`powershell -NoProfile -Command "${script}"`, {
    env: { ...process.env, _DPAPI_INPUT: blob },
    encoding: "utf-8",
    windowsHide: true,
  })

  return result.trim()
}
