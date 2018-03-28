# BuildVersion
Automatically calculates the next semantic version, based on the branch being built
and the current version of a project - designed for use in a CI/CD pipeline.

## Install

```
npm install -g buildVersion
```

## Usage

As a command line utility:

```
buildVersion -h

Build Version

  Automatically calculates the next semantic version, based on the branch being
  built and the current version of a project

Options

  -h, --help              Show usage
  -V, --verbose           Print extra logging info
  -z, --dumpConfig        Dump the default config out to the command line. Cannot be used with any
                          other options
  -d, --dryrun            If set, will show what the next version is without updating the output file
  -o, --outputFile        The name of the file where BuildVersion will write its results. Defaults to
                          version.json
  -c, --config            The config file to read. If this is specified then the default config will
                          not be used.
  -v, --version           The current version, whatever it may be
  -m, --master            The version that master is currently on, whatever it may be
  -b, --branch            The branch being built. Defaults to develop
```

The current version can be stored as a Git tag, and retrieved with:

```
git describe --first-parent --exclude [a-zA-Z]* --tags --abbrev=0
```

This gets the tag that's on the current branch. It excludes tags that start with
alphabetical characters, but isn't foolproof!  **TODO** More work is needed here.

If you're using Git Flow (http://nvie.com/posts/a-successful-git-branching-model/)
then the `master` branch may be tagged with a version that's ahead of other branches,
such as `develop`.  This comes after a release, which causes the `release` branch to
be merged back into `develop` and `master`.  This will trigger 2 builds, each of
which will get new versions.  The `develop` build will increment the semver
Patch number, but the `master` build will increment Minor (depending on
configuration).  When development continues, we want the next `develop` build to
increment from the version tag on the `master` branch.

To get the version of the `master` branch, you can run:

```
git describe --first-parent --exclude [a-zA-Z]* --tags --abbrev=0 origin/master
```

## Forcing Versions

Occasionally you want to make a breaking change, which should bump the Major
semver number to the next value.  You can do this 2 ways, either by setting a
pre-release tag on the `master` branch, or by using using the forceVersion
setting in the configuration file (NYI).  If you do this though, you'll need
to remember to take the forceVersion setting out again after the release!

## Configuration

This covers which versions to increment when.  By default, a run on the `master`
branch will bump the Minor version and on develop, the Patch version.  This is
configurable though!  Run BuildVersion with the `--dumpConfig` flag to see the
JSON structure that defines the config.  This is can be saved in a config file
and modified, then used with the `--config` option.

The config specifies the

```
{
  "forceVersion": "",
  "develop": {
    "level": "patch"
  },
  "master": {
    "level": "minor"
  },
  "release": {
    "level": "preminor"
  },
  "pullrequest": {
    "level": "prepatch"
  },
  "feature": {
    "level": "prepatch"
  }
}
```
