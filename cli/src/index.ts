#!/usr/bin/env node
process.env.MSYS_NO_PATHCONV = "1"
import { Command } from "commander"
import { handleErrors } from "./util/error-handler"
import { searchCommand } from "./commands/search"
import { structureCommand } from "./commands/structure"
import { readCommand } from "./commands/read"
import { writeCommand } from "./commands/write"
import { createCommand } from "./commands/create"
import { activateCommand, inactiveObjectsCommand } from "./commands/activate"
import {
  transportInfoCommand,
  transportCreateCommand,
  transportReleaseCommand,
  transportListCommand,
  transportDeleteCommand
} from "./commands/transport"
import { testCommand } from "./commands/test"
import { syntaxCheckCommand } from "./commands/syntax"
import { atcRunCommand } from "./commands/atc"
import { prettyPrintCommand } from "./commands/pretty-print"
import {
  debugListenCommand,
  debugAttachCommand,
  debugBreakpointsCommand,
  debugStepCommand,
  debugStackCommand,
  debugVariablesCommand,
  debugChildVariablesCommand
} from "./commands/debug"
import { tableCommand, sqlCommand } from "./commands/table"
import { deleteCommand } from "./commands/delete"
import { whereusedCommand } from "./commands/whereused"
import { runCommand } from "./commands/run"
import { usersCommand } from "./commands/users"
import { packageContentsCommand } from "./commands/package"
import { execCommand } from "./commands/exec"
import { definitionCommand } from "./commands/definition"
import { classinfoCommand } from "./commands/classinfo"
import { completionCommand } from "./commands/completion"
import { quickfixCommand } from "./commands/quickfix"
import { renameCommand } from "./commands/rename"
import { systemsListCommand, systemsSearchCommand, systemsConnectCommand, systemsStatusCommand, systemsSwitchCommand, systemsRemoveCommand } from "./commands/systems"

const program = new Command()

program
  .name("abap-adt")
  .description("CLI for SAP ABAP ADT operations")
  .version("1.0.0")

// Search
program
  .command("search <query>")
  .description("Search for ABAP objects by name")
  .option("-t, --type <type>", "Object type filter (e.g. PROG/P, CLAS/OC)")
  .option("-m, --max <n>", "Maximum results", "100")
  .option("--json", "Output as JSON")
  .action((query, opts) => handleErrors(() => searchCommand(query, opts)))

// Structure
program
  .command("structure <objectUrl>")
  .description("Get object structure and metadata")
  .option("--json", "Output as JSON")
  .action((url, opts) => handleErrors(() => structureCommand(url, opts)))

// Read
program
  .command("read <objectUrl>")
  .description("Read source code of an ABAP object")
  .option("-v, --version <version>", "Version: active or inactive")
  .option("-i, --include <include>", "Class include: main, definitions, implementations, testclasses")
  .action((url, opts) => handleErrors(() => readCommand(url, opts)))

// Write
program
  .command("write <objectUrl>")
  .description("Write source code (handles lock/unlock cycle)")
  .requiredOption("-s, --source-file <path>", "Path to source file")
  .option("-r, --transport <trkorr>", "Transport request number")
  .action((url, opts) => handleErrors(() => writeCommand(url, opts)))

// Create
program
  .command("create <type> <name>")
  .description("Create a new ABAP object")
  .requiredOption("-p, --package <package>", "Package name")
  .requiredOption("-d, --description <desc>", "Object description")
  .option("-r, --transport <trkorr>", "Transport request number")
  .option("--parent-path <path>", "Parent path (auto-detected if omitted)")
  .option("--responsible <user>", "Responsible user")
  .option("-g, --function-group <fugr>", "Function group (for function-module type)")
  .action((type, name, opts) => handleErrors(() => createCommand(type, name, opts)))

// Activate
program
  .command("activate <objectName> <objectUrl>")
  .description("Activate an ABAP object")
  .option("--json", "Output as JSON")
  .action((name, url, opts) => handleErrors(() => activateCommand(name, url, opts)))

// Inactive objects
program
  .command("inactive-objects")
  .description("List all inactive objects")
  .option("--json", "Output as JSON")
  .action(opts => handleErrors(() => inactiveObjectsCommand(opts)))

// Transport commands
const transport = program.command("transport").description("Transport management")

transport
  .command("info <objectUrl>")
  .description("Get transport info for an object")
  .option("--devclass <pkg>", "Development class/package")
  .option("--json", "Output as JSON")
  .action((url, opts) => handleErrors(() => transportInfoCommand(url, opts)))

transport
  .command("create <objectUrl>")
  .description("Create a new transport request")
  .requiredOption("-d, --description <desc>", "Transport description")
  .requiredOption("--devclass <pkg>", "Development class/package")
  .option("--json", "Output as JSON")
  .action((url, opts) => handleErrors(() => transportCreateCommand(url, opts)))

transport
  .command("release <transportNumber>")
  .description("Release a transport request")
  .option("--ignore-locks", "Ignore locks")
  .option("--ignore-atc", "Ignore ATC checks")
  .option("--json", "Output as JSON")
  .action((num, opts) => handleErrors(() => transportReleaseCommand(num, opts)))

transport
  .command("list")
  .description("List user transports")
  .option("-u, --user <user>", "User (defaults to current)")
  .option("--json", "Output as JSON")
  .action(opts => handleErrors(() => transportListCommand(opts)))

transport
  .command("delete <transportNumber>")
  .description("Delete a transport request")
  .option("--json", "Output as JSON")
  .action((num, opts) => handleErrors(() => transportDeleteCommand(num, opts)))

// Test
program
  .command("test <objectUrl>")
  .description("Run ABAP unit tests")
  .option("--risk <level>", "Risk level: harmless, dangerous, critical")
  .option("--duration <level>", "Duration: short, medium, long")
  .option("--json", "Output as JSON")
  .action((url, opts) => handleErrors(() => testCommand(url, opts)))

// Syntax check
program
  .command("syntax-check <objectUrl>")
  .description("Run syntax check on ABAP source")
  .requiredOption("-s, --source-file <path>", "Path to source file")
  .option("--main-url <url>", "Main program URL")
  .option("--main-program <name>", "Main program name")
  .option("--json", "Output as JSON")
  .action((url, opts) => handleErrors(() => syntaxCheckCommand(url, opts)))

// ATC
program
  .command("atc <objectUrl>")
  .description("Run ATC checks")
  .option("--variant <name>", "Check variant", "DEFAULT")
  .option("--max <n>", "Maximum findings")
  .option("--json", "Output as JSON")
  .action((url, opts) => handleErrors(() => atcRunCommand(url, opts)))

// Pretty print
program
  .command("pretty-print")
  .description("Pretty-print ABAP source code")
  .requiredOption("-s, --source-file <path>", "Path to source file")
  .option("-o, --output <path>", "Output file (prints to stdout if omitted)")
  .action(opts => handleErrors(() => prettyPrintCommand(opts)))

// Debug commands
const debug = program.command("debug").description("Debugger operations")

debug
  .command("listen")
  .description("Start debug listener (blocks until breakpoint hit)")
  .option("--mode <mode>", "Debugging mode: user or terminal", "user")
  .option("-u, --user <user>", "Request user")
  .option("--timeout <ms>", "Timeout in milliseconds")
  .option("--json", "Output as JSON")
  .action(opts => handleErrors(() => debugListenCommand(opts)))

debug
  .command("attach <debuggeeId>")
  .description("Attach to a debuggee")
  .option("--mode <mode>", "Debugging mode: user or terminal", "user")
  .option("-u, --user <user>", "Request user")
  .option("--json", "Output as JSON")
  .action((id, opts) => handleErrors(() => debugAttachCommand(id, opts)))

debug
  .command("breakpoints <uri>")
  .description("Set breakpoints (URI format: /sap/bc/adt/.../source/main#start=LINE)")
  .option("--mode <mode>", "Debugging mode", "user")
  .option("-u, --user <user>", "Request user")
  .option("--terminal-id <id>", "Terminal ID")
  .option("--ide-id <id>", "IDE ID")
  .option("--client-id <id>", "Client ID")
  .option("--json", "Output as JSON")
  .action((uri, opts) => handleErrors(() => debugBreakpointsCommand(uri, opts)))

debug
  .command("step <stepType>")
  .description("Debug step: stepInto, stepOver, stepReturn, stepContinue, terminateDebuggee")
  .option("--uri <uri>", "Target URI for stepRunToLine/stepJumpToLine")
  .option("--json", "Output as JSON")
  .action((type, opts) => handleErrors(() => debugStepCommand(type, opts)))

debug
  .command("stack")
  .description("Get current debug call stack")
  .option("--json", "Output as JSON")
  .action(opts => handleErrors(() => debugStackCommand(opts)))

debug
  .command("variables <vars...>")
  .description("Inspect debug variables by ID")
  .option("--json", "Output as JSON")
  .action((vars, opts) => handleErrors(() => debugVariablesCommand(vars, opts)))

debug
  .command("children <parents...>")
  .description("Get child variables (use @ROOT for top-level)")
  .option("--json", "Output as JSON")
  .action((parents, opts) => handleErrors(() => debugChildVariablesCommand(parents, opts)))

// Table
program
  .command("table <tableName>")
  .description("Read table contents")
  .option("--rows <n>", "Maximum rows", "100")
  .option("--json", "Output as JSON")
  .action((name, opts) => handleErrors(() => tableCommand(name, opts)))

// SQL
program
  .command("sql <query>")
  .description("Run freestyle SQL query")
  .option("--rows <n>", "Maximum rows", "100")
  .option("--json", "Output as JSON")
  .action((query, opts) => handleErrors(() => sqlCommand(query, opts)))

// Delete
program
  .command("delete <objectUrl>")
  .description("Delete an ABAP object (handles lock/unlock)")
  .option("-r, --transport <trkorr>", "Transport request number")
  .action((url, opts) => handleErrors(() => deleteCommand(url, opts)))

// Where-used
program
  .command("whereused <objectUrl>")
  .description("Find where an object is used (usage references)")
  .option("-l, --line <n>", "Source line number")
  .option("-c, --column <n>", "Source column number")
  .option("--json", "Output as JSON")
  .action((url, opts) => handleErrors(() => whereusedCommand(url, opts)))

// Run class (IF_OO_ADT_CLASSRUN)
program
  .command("classrun <className>")
  .description("Run an ABAP class implementing IF_OO_ADT_CLASSRUN")
  .option("--json", "Output as JSON")
  .action((name, opts) => handleErrors(() => runCommand(name, opts)))

// Users
program
  .command("users")
  .description("List system users")
  .option("--json", "Output as JSON")
  .action(opts => handleErrors(() => usersCommand(opts)))

// Package contents
program
  .command("package <name>")
  .description("List package contents")
  .option("--json", "Output as JSON")
  .action((name, opts) => handleErrors(() => packageContentsCommand(name, opts)))

// Exec (arbitrary ABAP execution)
program
  .command("exec")
  .description("Execute arbitrary ABAP code via temp IF_OO_ADT_CLASSRUN class")
  .option("-s, --source-file <path>", "Path to ABAP source file")
  .option("-c, --code <code>", "Inline ABAP code (placed inside IF_OO_ADT_CLASSRUN~MAIN)")
  .option("--json", "Output as JSON")
  .action(opts => handleErrors(() => execCommand(opts)))

// Definition (go-to-definition)
program
  .command("definition <objectUrl>")
  .description("Find definition of a symbol at a given position")
  .requiredOption("-l, --line <n>", "Source line number")
  .requiredOption("--start-col <n>", "Start column of the symbol")
  .requiredOption("--end-col <n>", "End column of the symbol")
  .option("-s, --source-file <path>", "Source file (fetched from server if omitted)")
  .option("--implementation", "Find implementation instead of definition")
  .option("--main-program <name>", "Main program context")
  .option("--json", "Output as JSON")
  .action((url, opts) => handleErrors(() => definitionCommand(url, opts)))

// Class info (component listing)
program
  .command("classinfo <objectUrl>")
  .description("List class components (methods, attributes, types, events)")
  .option("--json", "Output as JSON")
  .action((url, opts) => handleErrors(() => classinfoCommand(url, opts)))

// Code completion
program
  .command("completion <sourceUrl>")
  .description("Get code completion proposals at a position")
  .requiredOption("-s, --source-file <path>", "Path to source file")
  .requiredOption("-l, --line <n>", "Source line number")
  .requiredOption("-c, --column <n>", "Source column number")
  .option("--json", "Output as JSON")
  .action((url, opts) => handleErrors(() => completionCommand(url, opts)))

// Quick fix
program
  .command("quickfix <objectUrl>")
  .description("Get fix proposals for a code issue at a position")
  .requiredOption("-s, --source-file <path>", "Path to source file")
  .requiredOption("-l, --line <n>", "Source line number")
  .requiredOption("-c, --column <n>", "Source column number")
  .option("--apply <index>", "Apply fix at given index")
  .option("--json", "Output as JSON")
  .action((url, opts) => handleErrors(() => quickfixCommand(url, opts)))

// Rename
program
  .command("rename <objectUrl>")
  .description("Rename a symbol (evaluate → preview → execute)")
  .requiredOption("-l, --line <n>", "Source line number")
  .requiredOption("--start-col <n>", "Start column of the symbol")
  .requiredOption("--end-col <n>", "End column of the symbol")
  .requiredOption("-n, --new-name <name>", "New name for the symbol")
  .option("-r, --transport <trkorr>", "Transport request number")
  .option("--json", "Output as JSON")
  .action((url, opts) => handleErrors(() => renameCommand(url, opts)))

// Systems (landscape file)
const systems = program.command("systems").description("SAP system landscape management")

systems
  .command("list")
  .description("List all systems from SAPUILandscape.xml")
  .option("-l, --landscape <path>", "Path to landscape file")
  .option("--urls", "Show HTTP URLs")
  .action(opts => handleErrors(() => systemsListCommand(opts)))

systems
  .command("search <query>")
  .description("Search systems by SID or name")
  .option("-l, --landscape <path>", "Path to landscape file")
  .action((query, opts) => handleErrors(() => systemsSearchCommand(query, opts)))

systems
  .command("status")
  .description("Show active connection")
  .action(() => systemsStatusCommand())

systems
  .command("connect <sid> [client]")
  .description("Connect to a system and store credentials")
  .option("-l, --landscape <path>", "Path to landscape file")
  .option("--no-https", "Force HTTP instead of auto-detecting HTTPS")
  .option("-u, --user <user>", "Username")
  .option("-p, --password <password>", "Password")
  .action((sid, client, opts) => handleErrors(() => systemsConnectCommand(sid, client, opts)))

systems
  .command("switch <key>")
  .description("Switch active connection (e.g. SE1/600)")
  .action((key) => systemsSwitchCommand(key))

systems
  .command("remove <key>")
  .description("Remove a stored connection")
  .action((key) => systemsRemoveCommand(key))

program.parse()
