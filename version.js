/*
Copyright 2018 Adam Knight

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const semver = require('semver')
const fs = require('fs');
const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')

// This sets up which number is incremented on a build.  Change this if
// you want to adjust the versions to suit a different style.
const branchSettings = {
  'forceVersion': null,
  'develop': {
    'level': 'patch'
  },
  'master': {
    'level': 'minor'
  },
  'release': {
    'level': 'preminor'
  },
  'pullrequest': {
    'level': 'prepatch'
  },
  'feature': {
    'level': 'prepatch'
  }
}

function readVersionFile() {
  var versionInfo = {};
  try {
    var txt = fs.readFileSync('version.json');
    versionInfo = JSON.parse(txt);
  } catch(err) {
    // No version file or file not readable
    versionInfo = {
      'currentVersion': '0.0.0',
      'nextVersion': ''
    };
  }

  return versionInfo;
}

function saveVersionFile(versionFile, versionInfo) {
  fs.writeFile(versionFile, JSON.stringify(versionInfo), function (err) {
    if (err) {
      console.log('Failed to write the version file! Error is ' + err);
      process.exit(1);
    }
    if(options.verbose) console.log('Wrote the version info to ' + versionFile);
  });

  return versionInfo;
}

function getConfig(options) {
  if(options.verbose) console.log('Actual Git branch is ' + options.branch);
  var branch = options.branch.replace(/^\//, "");                // Drop the leading slash
  branch = branch.replace(/^refs\//, "");           // Drop refs, if it comes at the start and is followed by /
  branch = branch.replace(/^heads\//, "");          // Drop heads, if it comes at the (new) start and is followed by /
  if(options.verbose) console.log('Trimmed Git branch is ' + branch);

  var index = branch;
  var label = null;
  if(index.match(/feature\/.*/)) {
    index = 'feature';
    label = branch.match(/feature\/(.*)/)[1];
  }
  if(index.match(/release\/.*/)) {
    index = 'release';
    label = branch.match(/release\/(.*)/)[1];
  }
  if(index.match(/pull\/.*/)) {
    index = 'pullrequest';
    label = 'pr';
  }

  if(options.verbose) console.log('Loading config for ' + index);

  var config = branchSettings[index];

  if(config == null) {
    if(options.verbose) console.log('Config not found, using defaults.  Set the branch up: ' + branch);
    config = {
      'level': 'patch'
    };
  }
  config.label = label;

  if(options.verbose) console.log('Config is ' + JSON.stringify(config));

  return config;
}

function updateVersionInfo(versionInfo, options) {
  if(options.verbose) console.log('The branch being updated is ' + options.branch);
  var config = getConfig(options);
  if(versionInfo.forceVersion) {
    if(options.verbose) console.log('The version is being forcibly set to ' + versionInfo.forceVersion);
    versionInfo.currentVersion = versionInfo.forceVersion;
    versionInfo.forceVersion = '';
  } else {
    var prerelease = semver.prerelease(versionInfo.previousVersion);
    if(prerelease && prerelease[0] == config.label) {
      // we're looking at a pre-release version, and want to update to another
      // pre-release version, so don't change the version number, just change
      // the pre-release tag.
      config.level = 'prerelease';

      // Develop can be behind the master version after a release.  Update it here!
    }
    console.log(JSON.stringify(versionInfo))
    if(versionInfo.masterVersion
      && semver.valid(versionInfo.masterVersion)
      && semver.gt(versionInfo.masterVersion, versionInfo.previousVersion)) {

        if(options.verbose) console.log('The master version is ahead: ' + versionInfo.masterVersion + ' > ' + versionInfo.previousVersion);
        versionInfo.previousVersion = versionInfo.masterVersion
    }

    var currentVersion = semver.inc(versionInfo.previousVersion, config.level, config.label);
    if(options.verbose) console.log('The next version has been calculated as ' + currentVersion);
    versionInfo.currentVersion = currentVersion;
  }

  return versionInfo;
}

var options = processCommandLine();

if(!semver.valid(options.version)) {
  console.error("The version " + options.version + " is not a valid semantic version. Please try again");
  process.exitCode = 1;
  return;
}

//var versionInfo = readVersionFile(versionFile);
var versionInfo = {};
versionInfo.previousVersion = options.version;
versionInfo.masterVersion = options.master;
versionInfo = updateVersionInfo(versionInfo, options);

if(!options.dryrun) {
  saveVersionFile(options.outputFile, versionInfo);
} else {
  if(options.verbose) console.log('The resulting output is:');
  // Print the result on the command line
  console.log(JSON.stringify(versionInfo));
}

if(options.verbose) console.log('Previous version was ' + versionInfo.previousVersion);
if(options.verbose) console.log('New version is ' + versionInfo.currentVersion);

/*
 * Reads the command line and sets any params that are requested
 */
function processCommandLine() {
  const optionDefinitions = [
    { name: 'help', alias: 'h', type: Boolean,
      description: 'Show usage' },
    { name: 'verbose', alias: 'V', type: Boolean,
      description: 'Print extra logging info' },
    { name: 'dumpConfig', alias: 'z', type: Boolean,
      description: 'Dump the default config out to the command line. Cannot be'
      + ' used with any other options' },
    { name: 'dryrun', alias: 'd', type: Boolean,
      description: 'If set, will show what the next version is without updating'
      + ' the output file. Cannot be used with the --output option.'  },
    { name: 'outputFile', alias: 'o', type: String,
      description: 'The name of the file where BuildVersion will write its'
      + ' results. Defaults to version.json. Cannot be used with the --dryrun'
      + ' flag', typeLabel: '[underline]{file}' },
    { name: 'config', alias: 'c', type: String,
      description: 'The config file to read. If this is specified then the'
      + ' default config will not be used.', typeLabel: '[underline]{file}' },
    { name: 'version', alias: 'v', type: String,
      description: 'The current version, whatever it may be',
      typeLabel: '[underline]{version}' },
    { name: 'master', alias: 'm', type: String,
      description: 'The version that master is currently on, whatever it may be',
      typeLabel: '[underline]{master}' },
    { name: 'branch', alias: 'b', type: String,
      description: 'The branch being built. Defaults to develop',
      typeLabel: '[underline]{branch}' }
  ];

  const sections = [
    {
      header: 'Build Version',
      content: 'Automatically calculates the next semantic version, based on ' +
        'the branch being built and the current version of a project'
    },
    {
      header: 'Synopsis',
      content: [
        '$ buildVersion --help',
        '$ buildVersion --dumpConfig',
        '$ buildVersion [--verbose] --branch develop --version 1.0.7 '
          + '--master 1.1.0 [--outputFile version.json] '
          + '[--config config.json]',
        '$ buildVersion [--verbose] --branch develop --version 1.0.7 [--dryrun]'
          + '[--config config.json]'
      ]
    },
    {
      header: 'Options',
      optionList: optionDefinitions
    }
  ]

  var exitCode = 0;
  try {
    var options = {};
    options = commandLineArgs(optionDefinitions);

  } catch(err) {
    if(err.name === 'UNKNOWN_OPTION') {
      console.error('Unknown option: ' + err.optionName);
    } else if(err.name === 'ALREADY_SET') {
      console.error('Option set more than once: ' + err.optionName);
    } else {
      console.error('Error reading the command line: ' + err);
    }

    exitCode = 1;
    options.help = true;
  }

  if (options.help) {
    const usage = commandLineUsage(sections)
    console.log(usage)
    process.exit(exitCode);
  }

  // Cannot have the dryrun flag and output file set at the same time
  if(options.dryrun && options.outputFile) {
    console.error('Cannot set the --dryrun and --output options at the same time');
    process.exit(1);
  }

  // The version is mandatory
  if(! options.version) {
    console.error('You have to set the --version');
    process.exit(1);
  }

  // Apply defaults
  if (! options.verbose) options.verbose = false;
  if (! options.outputFile) options.outputFile = 'version.json';
  if (! options.branch) options.branch = 'develop';

  return options;
}
