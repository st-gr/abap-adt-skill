import { CreatableTypeIds } from "@st-gr/abap-adt-api-patched"
import { getClient } from "../client"

const TYPE_ALIASES: Record<string, CreatableTypeIds> = {
  "program": "PROG/P",
  "prog": "PROG/P",
  "class": "CLAS/OC",
  "clas": "CLAS/OC",
  "interface": "INTF/OI",
  "intf": "INTF/OI",
  "function-group": "FUGR/F",
  "fugr": "FUGR/F",
  "function-module": "FUGR/FF",
  "include": "PROG/I",
  "table": "TABL/DT",
  "tabl": "TABL/DT",
  "structure": "TABL/DS",
  "cds": "DDLS/DF",
  "ddls": "DDLS/DF",
  "data-element": "DTEL/DE",
  "dtel": "DTEL/DE",
  "domain": "DOMA/DD",
  "doma": "DOMA/DD",
  "package": "DEVC/K",
  "devc": "DEVC/K",
  "message-class": "MSAG/N",
  "msag": "MSAG/N",
  "dcls": "DCLS/DL",
  "ddlx": "DDLX/EX",
  "service-definition": "SRVD/SRV",
  "service-binding": "SRVB/SVB"
}

function resolveType(input: string): CreatableTypeIds {
  const lower = input.toLowerCase()
  if (TYPE_ALIASES[lower]) return TYPE_ALIASES[lower]
  // Try as raw type ID (e.g. "CLAS/OC")
  if (input.includes("/")) return input as CreatableTypeIds
  console.error(`Unknown type: ${input}`)
  console.error(`Available types: ${Object.keys(TYPE_ALIASES).join(", ")}`)
  process.exit(1)
}

export async function createCommand(
  type: string,
  name: string,
  options: {
    package: string
    description: string
    transport?: string
    parentPath?: string
    responsible?: string
    functionGroup?: string
  }
) {
  const client = await getClient()
  const objtype = resolveType(type)

  let parentName: string
  let parentPath: string

  if (objtype === "FUGR/FF" || objtype === "FUGR/I") {
    // Function modules/includes: parent is the function group, not the package
    const fugr = options.functionGroup || options.package
    if (!fugr) {
      console.error("Error: --function-group (or --package with function group name) is required for function modules")
      process.exit(1)
    }
    parentName = fugr.toUpperCase()
    parentPath = options.parentPath || `/sap/bc/adt/functions/groups/${encodeURIComponent(parentName.toLowerCase())}`
  } else {
    parentName = options.package.toUpperCase()
    parentPath = options.parentPath || `/sap/bc/adt/packages/${encodeURIComponent(parentName.toLowerCase())}`
  }

  await client.createObject(
    objtype,
    name.toUpperCase(),
    parentName,
    options.description,
    parentPath,
    options.responsible || "",
    options.transport || ""
  )

  console.log(`Created ${objtype} ${name.toUpperCase()} in ${parentName}`)
  if (options.transport) {
    console.log(`Transport: ${options.transport}`)
  }
}
