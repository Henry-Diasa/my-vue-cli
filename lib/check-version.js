const semver = require("semver");
const request = require("request");
const chalk = require("chalk");
const packageConfig = require("../package.json");

module.exports = (done) => {
  if (!semver.satisfies(process.version, packageConfig.engines.node)) {
    return console.log(
      chalk.red(
        "  You must upgrade node to >=" +
          packageConfig.engines.node +
          ".x to use vue-cli"
      )
    );
  }
  request(
    {
      url: "https://registry.npmjs.org/vue-cli",
      timeout: 1000,
    },
    (err, res, body) => {
      if (!err && res.statusCode === 200) {
        const latestVersion = JSON.parse(body)["dist-tags"].latest;
        const localVersion = packageConfig.version;
        console.log("version", localVersion, latestVersion);

        if (semver.lt(localVersion, latestVersion)) {
          console.log(
            chalk.yellow("  A newer version of vue-cli is available.")
          );
          console.log();
          console.log("  latest:    " + chalk.green(latestVersion));
          console.log("  installed: " + chalk.red(localVersion));
          console.log();
        }
      }
      done();
    }
  );
};
