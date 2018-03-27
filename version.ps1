$version = git describe --first-parent --exclude [a-zA-Z]* --tags --abbrev=0
$masterVersion = git describe --first-parent --exclude [a-zA-Z]* --tags --abbrev=0 origin/master

Write-Host "##vso[task.setvariable variable=version]$version"
Write-Host "##vso[task.setvariable variable=masterVersion]$masterVersion"

node .cicd\version\version.js --branch $env:Build.SourceBranch --version $version --master $masterVersion --versionFile version.json -V

$versions = ConvertFrom-Json "$(get-content "version.json")"
$currentVersion = $versions.currentVersion

Write-Host The current version is now $currentVersion;

Write-Host ("##vso[build.updatebuildnumber]$currentVersion")
