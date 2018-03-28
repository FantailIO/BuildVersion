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

Version updater

  Advances the version along to the next semantic version, based on the branch
  being built.

Options

  -h, --help               Show usage
  -V, --verbose            Print extra logging info
  -f, --versionFile file   The name of the version file. If specified, this file must exist. Defaults to
                           version.json
  -v, --version version    The current semantic version, defaults to 0.0.0
  -m, --master master      The semantic version that master is currently on
  -b, --branch branch      The branch being built. Defaults to develop
```

The current version can be stored as a Git tag, and retrieved with:

```
git describe --first-parent --exclude [a-zA-Z]* --tags --abbrev=0
```

This gets the tag that's on the current branch. It excludes tags that start with
alphabetical characters, but isn't foolproof!  **TODO** More work is needed here.

If you're using Git Flow (http://nvie.com/posts/a-successful-git-branching-model/)
then the *master* branch may be tagged with a version that's ahead of other branches,
such as *develop*.  This comes after a release, which causes the *release* branch to
be merged back into *develop* and *master*.  This will trigger 2 builds, each of
which will get new versions.  The *develop* build will increment the semver
Patch number, but the *master* build will increment Minor (depending on
configuration).  When development continues, we want the next *develop* build to
increment from the version tag on the *master* branch.

To get the version of the *master* branch, you can run:

```
git describe --first-parent --exclude [a-zA-Z]* --tags --abbrev=0 origin/master
```

## Forcing Versions

Occasionally you want to make a breaking change, which should bump the Major
semver number to the next value.  You can do this 2 ways, either by setting a
pre-release tag on the *master* branch, or by using using the forceVersion
setting in the configuration file (NYI).  If you do this though, you'll need
to remember to take the forceVersion setting out again after the release!

## Configuration

This covers which versions to increment when.  
