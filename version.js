const semver = require('semver')
const fs = require("fs");

const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')

// This sets up which number is incremented on a build.  Change this if
// you want to adjust the versions to suit a different style.
const branchSettings = {
  "develop": {
    "level": "patch"
  },
  "master": {
    "level": "minor"
  },
  "release": {
    "level": "preminor",
    "label": "rc"
  },
  "feature": {
    "level": "prepatch",
    "label": "beta"
  }
}

function readVersionFile() {
  var versionInfo = {};
  try {
    var txt = fs.readFileSync("version.json");
    versionInfo = JSON.parse(txt);
  } catch(err) {
    // No version file or file not readable
    versionInfo = {
      "currentVersion": "0.0.0",
      "nextVersion": ""
    };
  }

  return versionInfo;
}

function saveVersionFile(versionFile, versionInfo) {
  fs.writeFile(versionFile, JSON.stringify(versionInfo), function (err) {
    if (err) {
      console.log("Failed to write the version file! Error is " + err);
      process.exit(1);
    }
    if(verbose) console.log('Wrote the version info to ' + versionFile);
  });

  return versionInfo;
}

function getConfig(branch) {
  var index = branch;
  if(index.match(/feature\/.*/)) index = "feature";
  if(index.match(/release\/.*/)) index = "release";

  if(verbose) console.log("Loading config for " + index);
  var config = branchSettings[index];
  if(verbose) console.log("Config is " + JSON.stringify(config));
  if(config == null) {
    if(verbose) console.log("Config not found, using defaults.  Set the branch up: " + branch);
    config = {
      "level": "patch"
    };
  }

  return config;
}

function updateVersionInfo(versionInfo, branch) {
  var config = getConfig(branch);
  if(versionInfo.forceVersion) {
    versionInfo.currentVersion = versionInfo.forceVersion;
    versionInfo.forceVersion = "";
  } else {
    var prerelease = semver.prerelease(versionInfo.currentVersion);
    if(prerelease && prerelease[0] == config.label) {
      // we're looking at a pre-release version, and want to update to another
      // pre-release version, so don't change the version number, just change
      // the pre-release tag.
      config.level = "prerelease";
    }

    var currentVersion = semver.inc(versionInfo.currentVersion, config.level, config.label);
    versionInfo.currentVersion = currentVersion;
  }

  return versionInfo;
}

processCommandLine();
var versionInfo = readVersionFile(versionFile);
versionInfo.previousVersion = versionInfo.currentVersion;
versionInfo = updateVersionInfo(versionInfo, branch);

if(!dryrun) {
  if(verbose) console.log("Saving the updated version number to " + versionFile);
  saveVersionFile(versionFile, versionInfo);
} else {
  if(verbose) console.log("Dry Run - not saving the version number");
}

console.log("Previous version was " + versionInfo.previousVersion);
console.log("New version is " + versionInfo.currentVersion);

/*
 * Reads the command line and sets any params that are requested
 */
function processCommandLine() {
  const optionDefinitions = [
    { name: 'help', alias: '?', type: Boolean, description: "Show usage" },
    { name: 'verbose', alias: 'v', type: Boolean, description: "Print extra logging info (NYI)" },
    { name: 'forceVersion', alias: 'f', type: String, description: "Forces the next version number to be set to this value", typeLabe: '[underline]{version}' },
    { name: 'dryrun', alias: 'd', type: Boolean, description: "If set, will show what the next version is without updating the version file" },
    { name: 'versionFile', type: String, description: "The name of the version file. If specified, this file must exist. Defaults to version.json", typeLabel: '[underline]{file}' },
    { name: 'branch', alias: 'b', type: String, description: "The branch being built. Defaults to develop", typeLabel: '[underline]{branch}' }
  ];

  const sections = [
    {
      header: 'Version updater',
      content: 'Advances the version along to the next semantic version, based on the branch being built.'
    },
    {
      header: 'Options',
      optionList: optionDefinitions
    }
  ]

  const options = commandLineArgs(optionDefinitions);

  if (options.help) {
    const usage = commandLineUsage(sections)
    console.log(usage)
    process.exit(1);
  }

  // Apply defaults
  if (options.verbose == null) options.verbose = false;
  if (options.versionFile == null) options.versionFile = "version.json";
  if (options.branch == null) options.branch = "develop";

  verbose = options.verbose;
  forceVersion = options.forceVersion;
  dryrun = options.dryrun;
  versionFile = options.versionFile;
  branch = options.branch;
}
