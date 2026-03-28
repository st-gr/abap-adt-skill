import { getClient, withStatefulSession } from "../client"

export async function deleteCommand(
  objectUrl: string,
  options: { transport?: string }
) {
  await withStatefulSession(async c => {
    const lock = await c.lock(objectUrl)
    const lockHandle = lock.LOCK_HANDLE

    try {
      let transport = options.transport || lock.CORRNR
      if (!transport) {
        const info = await c.transportInfo(objectUrl)
        if (info.RECORDING && info.RECORDING !== " ") {
          if (info.TRANSPORTS && info.TRANSPORTS.length > 0) {
            transport = info.TRANSPORTS[0].TRKORR
            console.log(`Using transport: ${transport} (${info.TRANSPORTS[0].AS4TEXT})`)
          } else {
            console.error("Transport required but none available.")
            await c.unLock(objectUrl, lockHandle)
            process.exit(1)
          }
        }
      }

      await c.deleteObject(objectUrl, lockHandle, transport || undefined)
      console.log(`Deleted: ${objectUrl}`)
    } catch (err) {
      try { await c.unLock(objectUrl, lockHandle) } catch { /* ignore */ }
      throw err
    }
  })
}
