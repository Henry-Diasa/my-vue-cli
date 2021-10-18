#!/usr/bin/env node
const path = require("path");
const download = require('download-git-repo')
const exists = require("fs").existsSync;
const program = require("commander");
const inquirer = require("inquirer");
const chalk = require("chalk");
const rm = require('rimraf').sync
const ora = require("ora");
const tildify = require("tildify");
const home = require("user-home");

const logger = require("../lib/logger");
const generate = require("../lib/generate");
const localPath = require("../lib/local-path");
const checkVersion = require("../lib/check-version");
const warnings = require("../lib/warnings");
const isLocalPath = localPath.isLocalPath;
const getTemplatePath = localPath.getTemplatePath;
program
  .usage("<template-name> [project-name]")
  .option("-c, --clone", "use git clone")
  .option("--offline", "use cached template");

// 帮助信息
program.on("--help", () => {
  console.log("  Examples:");
  console.log();
  console.log(
    chalk.gray("    # create a new project with an official template")
  );
  console.log("    $ vue init webpack my-project");
  console.log();
  console.log(
    chalk.gray("    # create a new project straight from a github template")
  );
  console.log("    $ vue init username/repo my-project");
  console.log();
});
// 少于一个参数 执行help
function help() {
  program.parse(process.argv);
  if (program.args.length < 1) return program.help();
}

help();

let template = program.args[0];
const hasSlash = template.indexOf("/") > -1;
const rawName = program.args[1];
const inPlace = !rawName || rawName === ".";

const name = inPlace ? path.relative("../", process.cwd()) : rawName;
const to = path.resolve(rawName || ".");
const clone = program.clone || false
const tmp = path.join(home, ".vue-templates", template.replace(/[\/:]/g, "-"));
// 缓存模板地址
if (program.offline) {
  console.log(`> Use cached template at ${chalk.yellow(tildify(tmp))}`);
  template = tmp;
}

if (inPlace || exists(to)) {
  inquirer
    .prompt([
      {
        type: "confirm",
        message: inPlace
          ? "Generate project in current directory?"
          : "Target directory exists. Continue?",
        name: "ok",
      },
    ])
    .then((answers) => {
      if (answers.ok) {
        run();
      }
    })
    .catch(logger.fatal);
} else {
  run();
}

function run() {
  if (isLocalPath(template)) {
    const templatePath = getTemplatePath(template);
    if (exists(templatePath)) {
      generate(name, templatePath, to, (err) => {
        if (err) logger.fatal(err);
        logger.success('Generated "%s".', name);
      });
    } else {
      logger.fatal('Local template "%s" not found.', template);
    }
  } else {
    checkVersion(() => {
      if (!hasSlash) {
        // use official templates
        const officialTemplate = "vuejs-templates/" + template;
        console.log(officialTemplate);
        if (template.indexOf("#") !== -1) {
          downloadAndGenerate(officialTemplate);
        } else {
          if (template.indexOf("-2.0") !== -1) {
            warnings.v2SuffixTemplatesDeprecated(template, inPlace ? "" : name);
            return;
          }

          downloadAndGenerate(officialTemplate);
        }
      } else {
        downloadAndGenerate(template);
      }
    });
  }
}

function downloadAndGenerate(template) {
  const spinner = ora("downloading template");
  spinner.start();
  // Remove if local template exists
  if (exists(tmp)) rm(tmp);
  console.log(template, tmp, 111);
  download(template, tmp, { clone }, (err) => {
    spinner.stop();
    if (err)
      logger.fatal(
        "Failed to download repo " + template + ": " + err.message.trim()
      );
    generate(name, tmp, to, (err) => {
      if (err) logger.fatal(err);
      console.log();
      logger.success('Generated "%s".', name);
    });
  });
}
