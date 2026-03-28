---
name: abap-adt
description: >
  Interact with SAP ABAP systems to search, read, modify, create, debug, and test
  ABAP workbench objects via ADT (ABAP Developer Tools). Use this skill when the user
  mentions SAP, ABAP, ADT, transports, ABAP classes, ABAP programs, function modules,
  or wants to work with ABAP objects on a remote SAP system.
---

# ABAP ADT Skill

You can interact with SAP ABAP systems through the `abap-adt` CLI tool.

## Security — Password Handling

**NEVER print, echo, eval, or log passwords or encrypted credential blobs.** You must:
- Never run `echo $ADT_PASS`, `printenv ADT_PASS`, or any command that would expose the password
- Never pass `--password` with an actual password value to any command
- Never read or display the `encryptedPassword` field from `~/.sap/adt-connection.json`
- If authentication fails (401), ask the user to re-run `abap-adt systems connect` — do not attempt to read or display credentials yourself

## Setup

### Switching systems (recommended)
Use the `systems` commands to browse and connect to SAP systems from `SAPUILandscape.xml`:
```bash
abap-adt systems list
abap-adt systems search SE1
abap-adt systems connect SE1 600
```
The `connect` command stores the connection (encrypted) to `~/.sap/adt-connection.json`. Multiple systems can be stored and switched between. No env vars needed after connecting (Windows).

Use `--no-https` to force HTTP.

### Managing connections
```bash
abap-adt systems status                # show all stored connections + active details
abap-adt systems switch SE1            # switch active connection (partial match supported)
abap-adt systems switch SS2/100        # switch with exact key
abap-adt systems remove SS2/100        # remove a stored connection
```

### Credentials
After `systems connect`, credentials are stored encrypted. No env vars needed for subsequent commands (Windows).

- **`ADT_PASS`** — only needed for the initial `systems connect` call, or as an override
- **`ADT_USER`** — optional override; defaults to stored user or OS username (uppercased)
- On non-Windows platforms, `ADT_PASS` must be set for every session

### Environment variable overrides
Env vars override the connection file when set:
- `ADT_URL`, `ADT_CLIENT`, `ADT_LANGUAGE`, `ADT_ALLOW_SELF_SIGNED`, `ADT_USER`, `ADT_PASS`

## CLI Invocation

After `abap-adt systems connect ...`, subsequent commands pick up the connection automatically:
```bash
abap-adt search "Z*"
abap-adt sql "SELECT * FROM T000"
```

### First-time setup (if `abap-adt` command not found)
```bash
npm install -g @st-gr/abap-adt-skill
```

All commands support `--json` for machine-readable output.

## Commands

### search — Find ABAP objects
```bash
abap-adt search "Z*" --type CLAS/OC --max 20
abap-adt search "Z*" --type DEVC/K              # search packages
abap-adt search "CL_ADT*" --type CLAS/OC        # search standard classes
```
Returns: Name, Type, Package, Description, URI for each match.

### structure — Object metadata
```bash
abap-adt structure /sap/bc/adt/oo/classes/zcl_my_class
```
Returns: Object name, type, description, source URI, class includes (for classes), links.

### read — Read source code
```bash
abap-adt read /sap/bc/adt/oo/classes/zcl_my_class
abap-adt read /sap/bc/adt/oo/classes/zcl_my_class --include definitions
abap-adt read /sap/bc/adt/programs/programs/zmy_report
```
If given an object URL (not a source URL), automatically resolves the source URI.
For classes, use `--include` to read: `main`, `definitions`, `implementations`, `testclasses`.

### write — Modify source code
```bash
abap-adt write /sap/bc/adt/oo/classes/zcl_my_class --source-file /tmp/source.abap --transport NPLK900042
```
**Handles the full lock-edit-save-unlock cycle automatically.**
- Sets a stateful session
- Locks the object
- Writes the source from the file
- Unlocks the object
- If no transport specified and one is required, auto-selects or errors with available transports

**Writing class includes** (testclasses, definitions, implementations):
```bash
abap-adt write /sap/bc/adt/oo/classes/zcl_my_class/includes/testclasses -s /tmp/tests.abap
```
For `testclasses`: automatically creates the include if it doesn't exist yet. The class must be activated before writing tests.

**Important workflow**: To modify ABAP source:
1. Read the current source with `read`
2. Write the modified source to a temp file using the Write tool
3. Use `write` to push it to SAP
4. Use `activate` to activate the object
5. Optionally run `syntax-check` to verify

### create — Create new objects
```bash
abap-adt create class ZCL_NEW_CLASS --package ZPACKAGE --description "My new class" --transport NPLK900042
abap-adt create program ZNEW_REPORT --package $TMP --description "Test report"
```
Type aliases: `program`, `class`, `interface`, `function-group`, `function-module`, `include`, `table`, `structure`, `cds`, `data-element`, `domain`, `package`, `message-class`, `service-definition`, `service-binding`

After creation, write source code and activate.

### delete — Delete an ABAP object
```bash
abap-adt delete /sap/bc/adt/programs/programs/zmy_report
abap-adt delete /sap/bc/adt/oo/classes/zcl_my_class --transport NPLK900042
```
Handles the lock-delete-unlock cycle. Auto-selects transport if required and available.

### activate — Activate objects
```bash
abap-adt activate ZCL_MY_CLASS /sap/bc/adt/oo/classes/zcl_my_class
```

### inactive-objects — List inactive objects
```bash
abap-adt inactive-objects
```

### transport — Transport management
```bash
abap-adt transport info /sap/bc/adt/oo/classes/zcl_my_class
abap-adt transport create /sap/bc/adt/oo/classes/zcl_my_class --description "My changes" --devclass ZPACKAGE
abap-adt transport release NPLK900042
abap-adt transport list --user DEVELOPER
abap-adt transport delete NPLK900042
```

### test — Run ABAP unit tests
```bash
abap-adt test /sap/bc/adt/oo/classes/zcl_my_class
abap-adt test /sap/bc/adt/oo/classes/zcl_my_class --risk critical --duration long
```
Risk levels cascade up: `--risk critical` includes harmless+dangerous+critical.
Duration cascades similarly.

### syntax-check — Validate syntax
```bash
abap-adt syntax-check /sap/bc/adt/programs/programs/zmy_report --source-file /tmp/source.abap
```
Write the source to a temp file first, then pass the file path.

### atc — Run ATC quality checks
```bash
abap-adt atc /sap/bc/adt/oo/classes/zcl_my_class --variant DEFAULT
```

### pretty-print — Format ABAP code
```bash
abap-adt pretty-print --source-file /tmp/source.abap
abap-adt pretty-print --source-file /tmp/source.abap --output /tmp/formatted.abap
```

### table — Read database table
```bash
abap-adt table SFLIGHT --rows 10
abap-adt table HTTPURLLOC --rows 10
abap-adt table T000 --rows 50
```
The `table` command uses the ADT `tableContents` API. It returns columns and rows as structured data.
Response format: `{ columns: [{name}], values: [{COL1: val, COL2: val, ...}] }`
Column names are always UPPERCASE. String values may have trailing spaces — always `.trim()` when comparing.

### sql — Run SQL query
```bash
abap-adt sql "SELECT * FROM sflight WHERE carrid = 'LH'" --rows 50
abap-adt sql "SELECT * FROM T000" --rows 10
```
The `sql` command uses the ADT `runQuery` API. Same response format as `table`.
**Note**: Some older systems may return HTTP 400 for SQL queries — use `table` as a fallback.

### whereused — Find usage references
```bash
abap-adt whereused /sap/bc/adt/oo/classes/zcl_my_class
abap-adt whereused /sap/bc/adt/oo/classes/zcl_my_class --line 10 --column 5
```
Returns all objects that reference the given object (callers, includes, type usages).

### classrun — Execute an ABAP class
```bash
abap-adt classrun ZCL_MY_RUNNER
```
Runs a class that implements `IF_OO_ADT_CLASSRUN` and returns its console output. Does not work with reports — only classes with `IF_OO_ADT_CLASSRUN~MAIN`.

### users — List system users
```bash
abap-adt users
```

### package — List package contents
```bash
abap-adt package $TMP
abap-adt package ZDEV
```
Lists all objects in a development package with type and name.

### exec — Execute arbitrary ABAP code
```bash
abap-adt exec --code "out->write( 'hello world' )."
abap-adt exec --source-file /tmp/my_code.abap
```
Creates a temporary class implementing `IF_OO_ADT_CLASSRUN` in `$TMP`, writes the provided ABAP code into the `MAIN` method, activates, runs, prints output, and deletes the temp class. The code you provide is placed inside the method body — use `out->write()` for output.

### definition — Go to definition
```bash
abap-adt definition /sap/bc/adt/oo/classes/zcl_my_class/source/main --line 10 --start-col 5 --end-col 15
abap-adt definition /sap/bc/adt/oo/classes/zcl_my_class/source/main --line 10 --start-col 5 --end-col 15 --implementation
```
Finds the definition (or implementation with `--implementation`) of a symbol at the given source position. Returns URI, line, and column of the target. Source is fetched from server automatically unless `--source-file` is provided.

### classinfo — List class components
```bash
abap-adt classinfo /sap/bc/adt/oo/classes/zcl_my_class
```
Lists all class components (methods, attributes, types, events) with their visibility. Useful for understanding a class before reading its source.

### completion — Code completion
```bash
abap-adt completion /sap/bc/adt/oo/classes/zcl_my_class/source/main -s /tmp/source.abap --line 10 --column 5
```
Returns code completion proposals at the given position. Requires a source file and the source URL.

### quickfix — Fix proposals
```bash
abap-adt quickfix /sap/bc/adt/oo/classes/zcl_my_class/source/main -s /tmp/source.abap --line 10 --column 5
abap-adt quickfix /sap/bc/adt/oo/classes/zcl_my_class/source/main -s /tmp/source.abap --line 10 --column 5 --apply 0
```
Lists available quick fixes at a position. Use `--apply <index>` to retrieve the actual edits for a fix.

### rename — Rename refactoring
```bash
abap-adt rename /sap/bc/adt/oo/classes/zcl_my_class/source/main --line 8 --start-col 14 --end-col 22 --new-name evaluate_number
abap-adt rename /sap/bc/adt/oo/classes/zcl_my_class/source/main --line 8 --start-col 14 --end-col 22 --new-name evaluate_number --transport NPLK900042
```
Renames a symbol across all usages. Evaluates the rename, previews affected objects, then executes. Requires a transport for non-$TMP objects.

### Useful SAP Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| `HTTPURLLOC` | HTTP/HTTPS URL configuration | PROTOCOL, HOST, PORT |
| `T000` | SAP clients | MANDT, MTEXT |
| `TDEVC` | Development packages | DEVCLASS, DLVUNIT, PARENTCL |
| `DD02L` | Table directory (all tables) | TABNAME, TABCLASS, AS4LOCAL |
| `TADIR` | Object directory (all objects) | PGMID, OBJECT, OBJ_NAME, DEVCLASS |
| `USR02` | User master (logon data) | BNAME, USTYP |
| `SFLIGHT` | Flight demo data | CARRID, CONNID, FLDATE |

### debug — Debugger operations
```bash
# Start listening for a debuggee (blocks until breakpoint is hit)
abap-adt debug listen --mode user
# Attach to the debuggee
abap-adt debug attach <debuggeeId> --mode user
# Set breakpoints (URI with line: /sap/bc/adt/.../source/main#start=42)
abap-adt debug breakpoints "/sap/bc/adt/programs/programs/zmy_report/source/main#start=10"
# Step through code
abap-adt debug step stepOver
abap-adt debug step stepInto
abap-adt debug step stepReturn
abap-adt debug step stepContinue
# Inspect call stack
abap-adt debug stack
# Inspect variables
abap-adt debug variables SY-SUBRC LV_RESULT
abap-adt debug children @ROOT
```

### systems — SAP system landscape
```bash
# List all SAPGUI systems from landscape file
abap-adt systems list
abap-adt systems list --urls              # include HTTP URLs in output
abap-adt systems list --landscape /path/to/file.xml

# Search systems by SID or name (case-insensitive)
abap-adt systems search S4
abap-adt systems search "solution manager"

# Connect to a system — saves connection to ~/.sap/adt-connection.json
abap-adt systems connect SE1 600
abap-adt systems connect SE1 600 --no-https --user DEVELOPER

# Show all stored connections and active connection details
abap-adt systems status

# Switch active connection (partial key match supported)
abap-adt systems switch SE1
abap-adt systems switch SS2/100

# Remove a stored connection
abap-adt systems remove SS2/100
```
The `connect` command auto-discovers HTTPS, stores credentials encrypted, and sets the connection as active. Use `--no-https` to force HTTP. If multiple landscape entries share the same SID, picks the first in non-interactive mode.

## Key Workflows

### Reading an ABAP object
1. Search: `abap-adt search "ZCL_MY*" --type CLAS/OC`
2. Get structure: `abap-adt structure /sap/bc/adt/oo/classes/zcl_my_class` (from search URI)
3. Read source: `abap-adt read /sap/bc/adt/oo/classes/zcl_my_class`

### Modifying source code
1. `abap-adt read /sap/bc/adt/oo/classes/zcl_my_class` — get current source
2. Write modified source to a temp file (e.g., `/tmp/abap_source.abap`)
3. `abap-adt write /sap/bc/adt/oo/classes/zcl_my_class -s /tmp/abap_source.abap -r NPLK900042`
4. `abap-adt activate ZCL_MY_CLASS /sap/bc/adt/oo/classes/zcl_my_class`
5. Optionally `abap-adt syntax-check` and `abap-adt test`

### Creating a new object
1. `abap-adt create class ZCL_NEW --package ZDEV --description "Description" --transport NPLK900042`
2. Write source to temp file
3. `abap-adt write /sap/bc/adt/oo/classes/zcl_new -s /tmp/source.abap -r NPLK900042`
4. `abap-adt activate ZCL_NEW /sap/bc/adt/oo/classes/zcl_new`

### Adding unit tests to a class
1. **Activate the class first** — the testclasses include cannot be created on an inactive class
2. Write test source to a temp file (local test class with `FOR TESTING`)
3. `abap-adt write /sap/bc/adt/oo/classes/zcl_new/includes/testclasses -s /tmp/tests.abap`
   (auto-creates the testclasses include if it doesn't exist)
4. `abap-adt activate ZCL_NEW /sap/bc/adt/oo/classes/zcl_new`
5. `abap-adt test /sap/bc/adt/oo/classes/zcl_new`

### Querying data
Use `table` for simple full-table reads (more reliable), `sql` for filtered queries:
```bash
# Read all rows from a table
abap-adt table T000 --rows 50

# SQL with WHERE clause
abap-adt sql "SELECT DEVCLASS, DLVUNIT FROM TDEVC WHERE DEVCLASS LIKE 'Z%'" --rows 100
```
**Tips**:
- Column names in results are UPPERCASE
- String values may have trailing spaces — `.trim()` when comparing
- `--rows` limits the result set (default varies by command)
- If `sql` returns HTTP 400, fall back to `table` and filter client-side

### Executing arbitrary ABAP
```bash
# Inline code (placed inside IF_OO_ADT_CLASSRUN~MAIN)
abap-adt exec --code "out->write( sy-datum )."

# From a file
abap-adt exec --source-file /tmp/my_logic.abap
```
The temp class is auto-cleaned up. Use `out->write()` for output.

### Debugging
1. `abap-adt debug listen --mode user` (runs in background — blocks until breakpoint hit)
2. User triggers the ABAP program in SAP
3. When debuggee found, `abap-adt debug attach <debuggeeId>`
4. `abap-adt debug stack` to see where you are
5. `abap-adt debug children @ROOT` to see local variables
6. `abap-adt debug step stepOver` / `abap-adt debug step stepInto` to navigate
7. `abap-adt debug step stepContinue` or `abap-adt debug step terminateDebuggee` to end

## Object Type Reference

| Type | ID | Example URI pattern |
|------|----|---------------------|
| Program | PROG/P | `/sap/bc/adt/programs/programs/<name>` |
| Class | CLAS/OC | `/sap/bc/adt/oo/classes/<name>` |
| Interface | INTF/OI | `/sap/bc/adt/oo/interfaces/<name>` |
| Function Group | FUGR/F | `/sap/bc/adt/functions/groups/<name>` |
| Function Module | FUGR/FF | `/sap/bc/adt/functions/groups/<group>/fmodules/<name>` |
| Table | TABL/DT | `/sap/bc/adt/ddic/tables/<name>` |
| CDS View | DDLS/DF | `/sap/bc/adt/ddic/ddl/sources/<name>` |
| Data Element | DTEL/DE | `/sap/bc/adt/ddic/dataelements/<name>` |
| Domain | DOMA/DD | `/sap/bc/adt/ddic/domains/<name>` |
| Package | DEVC/K | `/sap/bc/adt/packages/<name>` |
| Message Class | MSAG/N | `/sap/bc/adt/messageclass/<name>` |

## Error Handling

- **401/403**: Authentication failed — check `ADT_USER` and `ADT_PASS`
- **Lock conflict**: Another user has the object locked — ask user to release or wait
- **Transport required**: Object is not in `$TMP` — a transport number must be provided
- **Activation errors**: Usually syntax errors — read the messages and fix the source
- **Connection refused**: Check `ADT_URL` and ensure the SAP system is reachable
