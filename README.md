# ABAP ADT Skill for Claude Code

A Claude Code plugin and standalone CLI for interacting with SAP ABAP systems via ADT (ABAP Developer Tools).

Search, read, write, create, activate, test, debug, and execute ABAP objects directly from Claude Code or the command line.

## Installation

### CLI (standalone)

```bash
npm install -g @st-gr/abap-adt-skill
```

### Claude Code Plugin

Install as a Claude Code plugin to give Claude the ability to work with SAP ABAP systems.

## Quick Start

### 1. Connect to a system

```bash
abap-adt systems list                    # browse available SAP systems
abap-adt systems connect SBX 100         # connect and store credentials
```

### 2. Start using

```bash
abap-adt search "Z*" --type CLAS/OC      # search for classes
abap-adt read /sap/bc/adt/oo/classes/zcl_my_class   # read source
abap-adt table T000 --rows 10            # query table data
abap-adt sql "SELECT * FROM sflight WHERE carrid = 'LH'"
```

## Commands

| Command | Description |
|---------|-------------|
| `search <query>` | Search for ABAP objects by name |
| `read <objectUrl>` | Read source code |
| `write <objectUrl>` | Write source code (lock/unlock cycle) |
| `create <type> <name>` | Create a new ABAP object |
| `activate <name> <url>` | Activate an object |
| `delete <objectUrl>` | Delete an object |
| `structure <objectUrl>` | Get object metadata |
| `test <objectUrl>` | Run ABAP unit tests |
| `syntax-check <objectUrl>` | Validate syntax |
| `atc <objectUrl>` | Run ATC quality checks |
| `pretty-print` | Format ABAP source code |
| `table <name>` | Read database table contents |
| `sql <query>` | Run freestyle SQL query |
| `exec` | Execute arbitrary ABAP code |
| `classrun <name>` | Run IF_OO_ADT_CLASSRUN class |
| `definition <objectUrl>` | Go-to-definition |
| `classinfo <objectUrl>` | List class components |
| `completion <sourceUrl>` | Code completion proposals |
| `quickfix <objectUrl>` | Fix proposals for code issues |
| `rename <objectUrl>` | Rename refactoring |
| `whereused <objectUrl>` | Find usage references |
| `transport info\|create\|release\|list\|delete` | Transport management |
| `debug listen\|attach\|step\|stack\|variables\|children` | Debugger (experimental) |
| `systems list\|search\|connect\|status\|switch\|remove` | System management |
| `inactive-objects` | List inactive objects |
| `package <name>` | List package contents |
| `users` | List system users |

All commands support `--json` for machine-readable output.

## System Connection

Credentials are stored encrypted (DPAPI on Windows) in `~/.sap/adt-connection.json`. Multiple connections can be stored and switched between:

```bash
abap-adt systems status                  # show all connections
abap-adt systems switch SBX              # switch active system
abap-adt systems remove SBX/100          # remove a connection
```

Environment variables (`ADT_URL`, `ADT_USER`, `ADT_PASS`, `ADT_CLIENT`) override stored credentials when set.

## Known Limitations

- **Debug commands** are experimental — external ADT debugging may not work on all system configurations. SAP GUI debugger is recommended for debugging.
- **ATC checks** may return HTTP 500 on some older systems.
- **SQL queries** may return HTTP 400 on some older systems — use `table` as a fallback.

## License

MIT — see [LICENSE](LICENSE) for details.

Based on [abap-adt-api](https://github.com/marcellourbani/abap-adt-api) by Marcello Urbani (MIT).
