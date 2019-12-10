# IBM Cloud Asset Generator

[![IBM Cloud powered][img-ibmcloud-powered]][url-cloud]

[img-ibmcloud-powered]: https://img.shields.io/badge/IBM%20Cloud-powered-blue.svg
[url-cloud]: http://bluemix.net
[url-npm]: https://www.npmjs.com/package/generator-ibm-cloud-assets
[img-license]: https://img.shields.io/npm/l/generator-ibm-cloud-assets.svg
[img-version]: https://img.shields.io/npm/v/generator-ibm-cloud-assets.svg
[img-npm-downloads-monthly]: https://img.shields.io/npm/dm/generator-ibm-cloud-assets.svg
[img-npm-downloads-total]: https://img.shields.io/npm/dt/generator-ibm-cloud-assets.svg

[img-travis-master]: https://travis-ci.org/ibm-developer/generator-ibm-cloud-assets.svg?branch=master
[url-travis-master]: https://travis-ci.org/ibm-developer/generator-ibm-cloud-assets/branches

[img-coveralls-master]: https://coveralls.io/repos/github/ibm-developer/generator-ibm-cloud-assets/badge.svg
[url-coveralls-master]: https://coveralls.io/github/ibm-developer/generator-ibm-cloud-assets

[img-codacy]: https://api.codacy.com/project/badge/Grade/a5893a4622094dc8920c8a372a8d3588?branch=master
[url-codacy]: https://www.codacy.com/app/ibm-developer/generator-ibm-cloud-assets

Creates the files required to deploy projects to Kubernetes (using Helm Charts) and/or Cloud Foundry (using a generated manifest). Also, provides scripts to initiate IBM Cloud’s DevOps Toolchain.

## Pre-requisites 

Install [Yeoman](http://yeoman.io)
Install [Helm](https://github.com/kubernetes/helm#install) 
 * Required to run unit tests
```bash
npm install -g yo
```

## Installation

```bash
npm install -g generator-ibm-cloud-assets
```

## Usage

```bash
yo ibm-cloud-assets
```

Following command line arguments are supported:
* `--deploy_options {stringified-json} --application {stringified-array}` -  used by Scaffolder to supply project information from `pman`. You can also supply a local file containing compatible JSON object by using `--deploy_options file:<path/to/file.json> --application file:<path/to/file.json>`.

## Artifacts

Here is a list of the files and folders you receive after executing the generator:  

File  | Purpose
---       | ---
Dockerfile | Configuration file for the run container.
docker-compose.yml | Configuration for the run container *if services option is added*
Dockerfile-tools | Configuration file for the tools container 
docker-compose-tools.yml | Configuration file for the tool container, *if services option is added* 
Jenkinsfile | Groovy script used in conjunction with deploying to Cloud Foundry
chart/* | Folder containing all the Helm yaml files required to deploy to Kubernetes
cli-config.yml | Yaml file containing mappings for various commands, files, and settings, utilized by the cli commands

## Development Environment

Clone this repository and link it via npm

```bash
git clone https://github.com/IBM/generator-ibm-cloud-assets
cd generator-ibm-cloud-assets
npm link
```

In a separate directory invoke the generator via

```bash
yo ibm-cloud-assets 
```

## Testing

To run the unit tests. Remember to install [Helm](https://github.com/kubernetes/helm#install) if you have not already before running the tests.

```
npm test
```

## Publishing Changes

In order to publish changes, you will need to fork the repository or branch off the `master` branch.

Make sure to follow the [conventional commit specification](https://conventionalcommits.org/) before contributing. To help you with commit a commit template is provide. Run `config.sh` to initialize the commit template to your `.git/config` or use [commitizen](https://www.npmjs.com/package/commitizen)

Once you are finished with your changes, run `npm test` to make sure all tests pass.

Do a pull request against `master`, make sure the build passes. A team member will review and merge your pull request.
Once merged to `master` an auto generated pull request will be created against master to update the changelog. Make sure that the CHANGELOG.md and the package.json is correct before merging the pull request. After the auto generated pull request has been merged to `master` the version will be bumped and published to public npm.
