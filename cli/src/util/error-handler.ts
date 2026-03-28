export async function handleErrors(fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch (e: any) {
    if (e?.response?.status) {
      const status = e.response.status
      const statusText = e.response.statusText || ""
      console.error(`HTTP Error ${status} ${statusText}`)
      if (status === 401 || status === 403) {
        console.error("Authentication failed. Check ADT_USER and ADT_PASS.")
      }
      if (e.response.data) {
        const body =
          typeof e.response.data === "string"
            ? e.response.data
            : JSON.stringify(e.response.data)
        // Extract meaningful error from XML response
        const match = body.match(/<message[^>]*>([^<]+)<\/message>/i)
        if (match) {
          console.error(`SAP Error: ${match[1]}`)
        } else if (body.length < 1000) {
          console.error(body)
        }
      }
    } else if (e?.message) {
      console.error(`Error: ${e.message}`)
    } else {
      console.error("Unknown error:", e)
    }
    process.exit(1)
  }
}
