import { getClient, withStatefulSession } from "../client"

export async function renameCommand(
  objectUrl: string,
  options: {
    line: string
    startCol: string
    endCol: string
    newName: string
    transport?: string
    json?: boolean
  }
) {
  const line = parseInt(options.line)
  const startCol = parseInt(options.startCol)
  const endCol = parseInt(options.endCol)

  await withStatefulSession(async client => {
    // Step 1: Evaluate — get the rename proposal
    const proposal = await client.renameEvaluate(objectUrl, line, startCol, endCol)

    if (options.json) {
      console.log(JSON.stringify({ proposal, oldName: proposal.oldName }, null, 2))
    } else {
      console.log(`Renaming "${proposal.oldName}" → "${options.newName}"`)
    }

    // Set the new name
    proposal.newName = options.newName

    // Step 2: Preview — see affected objects
    const transport = options.transport || ""
    const preview = await client.renamePreview(proposal, transport)

    if (!options.json && preview.affectedObjects && preview.affectedObjects.length > 0) {
      console.log(`\nAffected objects:`)
      for (const obj of preview.affectedObjects) {
        const deltas = obj.textReplaceDeltas?.length || 0
        console.log(`  ${obj.name} (${obj.type}) — ${deltas} change(s)`)
      }
    }

    // Step 3: Execute
    const result = await client.renameExecute(preview)

    if (options.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`\nRename completed successfully.`)
    }
  })
}
