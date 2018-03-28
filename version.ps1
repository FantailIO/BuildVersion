<#
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
#>

<#
This is provided as an example. I used this with a VSTS build to version a
GitFlow project. 
#>

$version = git describe --first-parent --exclude [a-zA-Z]* --tags --abbrev=0
$masterVersion = git describe --first-parent --exclude [a-zA-Z]* --tags --abbrev=0 origin/master

Write-Host "##vso[task.setvariable variable=version]$version"
Write-Host "##vso[task.setvariable variable=masterVersion]$masterVersion"

node .cicd\version\version.js --branch $env:Build.SourceBranch --version $version --master $masterVersion --outputFile version.json  

$versions = ConvertFrom-Json "$(get-content "version.json")"
$currentVersion = $versions.currentVersion

Write-Host The current version is now $currentVersion;

Write-Host ("##vso[build.updatebuildnumber]$currentVersion")
