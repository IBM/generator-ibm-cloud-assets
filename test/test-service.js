/*
 © Copyright IBM Corp. 2019
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/* eslint-env mocha */
'use strict';

const helpers = require('yeoman-test');
const assert = require('yeoman-assert');
const _ = require('lodash');
const path = require('path');
const yaml = require('js-yaml');

const utils = require('./test-utils');
// const fs = require('fs');
var memFs = require("mem-fs");
var editor = require("mem-fs-editor");
var store = memFs.create();
var fs = editor.create(store);

const SERVICES = utils.SERVICES;
const DEPLOY_OBJECTS = utils.baseDeployObjects;

function validateHelmChart(lang, deploy_type, service) {

}

function validateKnativeService(lang, deploy_type, services) {
    assert.file([
        'service.yaml'
    ]);
    let serviceYamlFilePath = "./service.yaml";
    let serviceYamlContents = yaml.safeLoad(fs.readFileSync(serviceYamlFilePath, 'utf8'));
}

function validateCF(lang, deploy_type, services) {

}

function validateDeployAssets(lang, deploy_type, services) {
    if (deploy_type === "knative") {
        validateKnativeService(lang, deploy_type, services);
    } else if (deploy_type === "helm") {
        validateHelmChart(lang, deploy_type, services);
    } else {
        validateCF(lang, deploy_type, services);
    }
}

describe("cloud-assets:service"), function() {
	this.timeout(10000);

    _.forEach(SERVICES, (service) => {
        _.forEach(Object.keys(DEPLOY_OBJECTS), (deploy_type) => {
            let lang = "NODE";
            let node_payload = utils.generateTestPayload(lang, lang, deploy_type, "helm", [service]);
            describe(`cloud-assets:service-${service} with ${lang} project deployed with ${deploy_type}`, function () {
                beforeEach(function () {
                    return helpers.run(path.join(__dirname, '../generators/app'))
                        .inDir(path.join(__dirname, './tmp'))
                        .withOptions({deploy_options: JSON.stringify(node_payload.deploy_options),
                                        application: JSON.stringify(node_payload.application)});
                });

                validateDeployAssets(lang, deploy_type, service);
        
                it('package.json with Cloud Env', function () {
                    assert.file([
                        'package.json'
                    ]);
                    assert.fileContent('package.json', 'RUN apt-get update && apt-get dist-upgrade -y && apt-get install -y \\');
                    assert.fileContent('package.json', '  libpq-dev \\');
                });
        
                it('should have the executableName property set in Dockerfile', function () {
                    assert.fileContent('Dockerfile', `CMD [ "sh", "-c", "cd /swift-project && .build-ubuntu/release/${applicationName}" ]`);
                });
            });
            
            lang = "PYTHON";
            let python_payload = utils.generateTestPayload(lang, lang, deploy_type, "helm", [service]);
            describe(`cloud-assets:service-${service} with ${lang} project with ${deploy_type}`, function () {
                beforeEach(function () {
                    return helpers.run(path.join(__dirname, '../generators/app'))
                        .inDir(path.join(__dirname, './tmp'))
                        .withOptions({deploy_options: JSON.stringify(python_payload.deploy_options),
                                        application: JSON.stringify(python_payload.application)});
                });
            });
            
            lang = "JAVA";
            let java_payload = utils.generateTestPayload(lang, lang, deploy_type, "helm", [service]);
            describe(`cloud-assets:service-${service} with ${lang} project with ${deploy_type}`, function () {
                beforeEach(function () {
                    return helpers.run(path.join(__dirname, '../generators/app'))
                        .inDir(path.join(__dirname, './tmp'))
                        .withOptions({deploy_options: JSON.stringify(java_payload.deploy_options),
                                        application: JSON.stringify(java_payload.application)});
                });
            });
            
            lang = "SPRING";
            let spring_payload = utils.generateTestPayload(lang, lang, deploy_type, "helm", [service]);
            describe(`cloud-assets:service-${service} with ${lang} project with ${deploy_type}`, function () {
                beforeEach(function () {
                    return helpers.run(path.join(__dirname, '../generators/app'))
                        .inDir(path.join(__dirname, './tmp'))
                        .withOptions({deploy_options: JSON.stringify(spring_payload.deploy_options),
                                        application: JSON.stringify(spring_payload.application)});
                });
            });

            lang = "SWIFT";
            let swift_payload = utils.generateTestPayload(lang, lang, deploy_type, "helm", [service]);
            describe(`cloud-assets:service-${service} with ${lang} project with ${deploy_type}`, function () {
                beforeEach(function () {
                    return helpers.run(path.join(__dirname, '../generators/app'))
                        .inDir(path.join(__dirname, './tmp'))
                        .withOptions({deploy_options: JSON.stringify(swift_payload.deploy_options),
                                        application: JSON.stringify(swift_payload.application)});
                });
            });

            lang = "GO";
            let go_payload = utils.generateTestPayload(lang, lang, deploy_type, "helm", [service]);
            describe(`cloud-assets:service-${service} with ${lang} project with ${deploy_type}`, function () {
                beforeEach(function () {
                    return helpers.run(path.join(__dirname, '../generators/app'))
                        .inDir(path.join(__dirname, './tmp'))
                        .withOptions({deploy_options: JSON.stringify(go_payload.deploy_options),
                                        application: JSON.stringify(go_payload.application)});
                });
            });
        });
    });
};