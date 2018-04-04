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
 const defaultConfig = {
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
};

/**
 * These are the command line option definitions, used to configure and control
 * the programme.
 */
const commandLineOptionSettings = [
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

/**
 * This is used to provide usage information from the command line, including a
 * couple of examples and details of the command line options available
 */
const commandLineUsageSettings = [
  {
    header: 'CI Version',
    content: 'Automatically calculates the next semantic version, based on ' +
      'the branch being built and the current version of a project'
  },
  {
    header: 'Synopsis',
    content: [
      '$ civersion --help',
      '$ civersion --dumpConfig',
      '$ civersion [--verbose] --branch develop --version 1.0.7 '
        + '--master 1.1.0 [--outputFile version.json] '
        + '[--config config.json]',
      '$ civersion [--verbose] --branch develop --version 1.0.7 [--dryrun]'
        + '[--config config.json]'
    ]
  },
  {
    header: 'Options',
    optionList: commandLineOptionSettings
  }
];


var CIVersion = {
  /**
   * Reads in a configuration file if it is requested via command line options
   */
  readConfigFile: function(options) {
    var config = null;
    try {
      var txt = fs.readFileSync(options.config);
      config = JSON.parse(txt);
    } catch(err) {
      // No version file or file not readable
      console.error("Could not read the config file " + options.config);
    }

    return config;
  },

  /**
   * Saves the version file for use by other processes or subsequent tasks
   */
  saveVersionFile: function(options, versionInfo) {
    if(options.dryrun) return;
    fs.writeFile(options.outputFile, JSON.stringify(versionInfo), function (err) {
      if (err) {
        console.error('Failed to write the version file! Error is ' + err);
        process.exitCode = 1;
      }
      if(options.verbose) console.log('Wrote the version info to ' + options.outputFile);
    });

    return versionInfo;
  },

  /**
   * Trims the Git branch to work out the index for the configuration hash. A lot
   * of this should be moved into the configuration files and defaults, to make it
   * more generic. The branches and processing I have used work on VSTS.
   * TODO - Make this configurable
   * TODO - Test this on other Git repos and CICD tools
   */
  decipherGitBranch: function(options) {
    if(options.verbose) console.log('Actual Git branch is ' + options.branch);
    var branch = options.branch.replace(/^\//, "");   // Drop the leading slash
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

    if(options.verbose) console.log('Branch ' + branch + ' resolves to config index ' + index);

    options.prereleaseLabel = label;
    return index;
  },

  /**
   * Works out the configuration for a particular branch from the config, either
   * default or from the config file.
   */
  getBranchVersionConfig: function(options, versionInfo) {
    var index = this.decipherGitBranch(options);
    if(options.config) {
      config = this.readConfigFile(options);
    } else {
      config = defaultConfig;
    }

    if(!config) {
      process.exitCode = 1;
      return null;
    }

    var branchConfig = config[index];

    if(branchConfig == null) {
      console.error('Branch configuration not found, please set up config for branch ' + options.branch);
      process.exitCode = 1;
    }

    versionInfo.forceVersion = config.forceVersion;

    if(options.verbose) console.log('Branch configuration is ' + JSON.stringify(branchConfig));

    return branchConfig;
  },

  /**
   * Updates the version.  This compares the current version with settings for the
   * branch, and the master branch's version if it is supplied and works out what
   * the next semantic version should be.
   */
  updateVersionInfo: function(versionInfo, options) {
    if(options.verbose) console.log('The branch being updated is ' + options.branch);
    var config = this.getBranchVersionConfig(options, versionInfo);

    if(config) {
      if(versionInfo.forceVersion) {
        if(options.verbose) console.log('The version is being forcibly set to ' + versionInfo.forceVersion);
        versionInfo.currentVersion = versionInfo.forceVersion;
      } else {
        var prerelease = semver.prerelease(versionInfo.previousVersion);
        if(prerelease && prerelease[0] == options.prereleaseLabel) {
          // we're looking at a pre-release version, and want to update to another
          // pre-release version, so don't change the version number, just change
          // the pre-release tag.
          config.level = 'prerelease';
        }

        // Develop can be behind the master version after a release.  Update it here!
        if(versionInfo.masterVersion
          && semver.valid(versionInfo.masterVersion)
          && semver.gt(versionInfo.masterVersion, versionInfo.previousVersion)) {

            if(options.verbose) console.log('The master version is ahead: ' + versionInfo.masterVersion + ' > ' + versionInfo.previousVersion);
            versionInfo.previousVersion = versionInfo.masterVersion
        }

        var currentVersion = semver.inc(versionInfo.previousVersion, config.level, options.prereleaseLabel);
        if(options.verbose) console.log('The next version has been calculated as ' + currentVersion);
        versionInfo.currentVersion = currentVersion;
      }
      return versionInfo;
    } else {
      // Could not load the config, so no version can be calculated
      return null;
    }
  },

  /*
   * Reads the command line and sets any params that are requested.  The testing
   * options are used for unit testing.
   */
  processCommandLine: function(testingOptions) {
    var exitCode = 0;
    try {
      var options = {};
      options = commandLineArgs(commandLineOptionSettings, testingOptions);
    } catch(err) {
      if(err.name === 'UNKNOWN_OPTION') {
        console.error('Unknown option: ' + err.optionName);
      } else if(err.name === 'ALREADY_SET') {
        console.error('Option set more than once: ' + err.optionName);
      } else {
        console.error('Error reading the command line: ' + err);
      }

      process.exitCode = 1;
      options.help = true;
    }

    // Special case when the user doesn't specify any options.
    if(!options.version && !options.help && !options.dumpConfig) {
      process.exitCode = 1;
      options.help = true;
    }

    if (options.help) {
      const usage = commandLineUsage(commandLineUsageSettings);
      console.log(usage);
      return;
    }

    this.validateOptions(options);

    // Apply defaults
    if (! options.verbose) options.verbose = false;
    if (! options.outputFile) options.outputFile = 'version.json';

    return options;
  },

  /**
   * Check that any options set are valid, that combinations are correct, etc.
   */
  validateOptions: function(options) {
    // Cannot have the dryrun flag and output file set at the same time
    if(options.dryrun && options.outputFile) {
      console.error('Cannot set the --dryrun and --output options at the same time');
      process.exitCode = 1;
    }

    // The version is mandatory, unless you're dumping the config
    if(!options.version && !options.dumpConfig) {
      console.error('You have to set the --version');
      process.exitCode = 1;
    }

    // The branch is mandatory, unless you're dumping the config
    if(!options.branch && !options.dumpConfig) {
      console.error('You have to set the --branch');
      process.exitCode = 1;
    }

    // Check the version is a valid semantic version
    if(options.version && !semver.valid(options.version)) {
      console.error("The version " + options.version + " is not a valid semantic version. Please try again");
      process.exitCode = 1;
      return;
    }

    // And check the master version
    if(options.master && !semver.valid(options.master)) {
      console.error("The master version " + options.master + " is not a valid semantic version. Please try again");
      process.exitCode = 1;
      return;
    }
  },

  main: function() {
    // public static void main starts below!!!
    var options = this.processCommandLine();

    // If there have been any problems, bail out
    if(process.exitCode || !options) {
      process.exit();
    }

    if(options.dumpConfig) {
      console.log(JSON.stringify(defaultConfig, null, 2));
    } else {
      var versionInfo = {};
      versionInfo.previousVersion = options.version;
      versionInfo.masterVersion = options.master;
      versionInfo = this.updateVersionInfo(versionInfo, options);

      if(!versionInfo) {
        // something went wrong upstream, bail output
        return;
      }

      if(!options.dryrun) {
        this.saveVersionFile(options, versionInfo);
      } else {
        if(options.verbose) console.log('The resulting output is:');
        // Print the result on the command line
        console.log(JSON.stringify(versionInfo, null, 2));
      }

      if(options.verbose) console.log('Previous version was ' + versionInfo.previousVersion);
      if(options.verbose) console.log('New version is ' + versionInfo.currentVersion);
    }
  }
}

exports = module.exports = CIVersion;
