#!/usr/bin/env node

const program = require("commander");

program
  .version(require("../package").version)
  .usage("<command> [options]")
  .command("init", "generate a new project from a template") // init 命令会默认找到vue-init
  .command("list", "list available official templates")
  .command("build", "prototype a new project")
  .command("create", "(for v3 warning only)");

program.parse(process.argv);
