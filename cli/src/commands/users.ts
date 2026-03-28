import { getStatelessClient } from "../client"

export async function usersCommand(
  options: { json?: boolean }
) {
  const client = await getStatelessClient()
  const users = await client.systemUsers()

  if (options.json) {
    console.log(JSON.stringify(users, null, 2))
    return
  }

  if (users.length === 0) {
    console.log("No users found.")
    return
  }

  for (const u of users) {
    console.log(`${u.id}  ${u.title || ""}`)
  }
}
