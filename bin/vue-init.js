#!/usr/bin/env node
const path = require("path");
const download = require('download-git-repo') // 下载远程仓库
const exists = require("fs").existsSync;
const program = require("commander");
const inquirer = require("inquirer"); // 交互式命令  A collection of common interactive command line user interfaces
const chalk = require("chalk");
const rm = require('rimraf').sync
const ora = require("ora"); // 加载样式 Elegant terminal spinner
const tildify = require("tildify"); // 转换路径  Convert an absolute path to tilde path
const home = require("user-home"); // Get the path to the user home directory

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

// 初始化init时 传递的一些参数 和 一些路径
let template = program.args[0];
const hasSlash = template.indexOf("/") > -1;
const rawName = program.args[1];
const inPlace = !rawName || rawName === ".";
const name = inPlace ? path.relative("../", process.cwd()) : rawName;
const to = path.resolve(rawName || ".");
// vue init webpacl my-vue-cli2 --clone   program.clone => true
const clone = program.clone || false
// 缓存模板地址
const tmp = path.join(home, ".vue-templates", template.replace(/[\/:]/g, "-"));
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
    // 本地模板
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
    // 远程模板
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
// 下载远程模板
function downloadAndGenerate(template) {
  const spinner = ora("downloading template");
  spinner.start();
  // Remove if local template exists
  if (exists(tmp)) rm(tmp);
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
