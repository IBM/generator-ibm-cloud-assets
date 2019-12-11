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

const utils = require('../generators/lib/utils');
const testUtils = require('./test-utils');
// const fs = require('fs');
var memFs = require("mem-fs");
var editor = require("mem-fs-editor");
var store = memFs.create();
var fs = editor.create(store);
const fse = require('fs-extra');

const SERVICES = testUtils.SERVICES;
const DEPLOY_OBJECTS = testUtils.baseDeployObjects;

function validateHelmChart(lang, deploy_type, service, applicationName) {
    const chartLocation = 'chart/' + utils.sanitizeAlphaNumLowerCase(applicationName);
    let chartFile = chartLocation + '/Chart.yaml';
    assert.file(chartFile);
    let valuesFile = chartLocation + '/values.yaml';
    assert.file(valuesFile);
    assert.file(chartLocation + '/templates/deployment.yaml');
    assert.file(chartLocation + '/templates/service.yaml');
    assert.file(chartLocation + '/templates/hpa.yaml');
    assert.file(chartLocation + '/templates/basedeployment.yaml');
}

function validateKnativeService(lang, deploy_type, services) {
    assert.file([
        'service.yaml'
    ]);
}

function validateCF(lang, deploy_type, services) {
    assert.file([
        'manifest.yml'
    ]);
}

function validateDeployAssets(lang, deploy_type, services, applicationName) {
    it('validateDeployAssets', function () {
        if (deploy_type === "knative") {
            validateKnativeService(lang, deploy_type, services);
        } else if (deploy_type === "helm") {
            validateHelmChart(lang, deploy_type, services, applicationName);
        } else {
            validateCF(lang, deploy_type, services);
        }
    });
}

function validateCreds(lang, services) {
    it('mappings.json and localdev-config.json exist', function () {
        if (lang === "NODE") {
            assert.file([
                'server/config/mappings.json'
            ]);
            assert.file([
                'server/localdev-config.json'
            ]);
    
        } else if (lang === "PYTHON") {
            assert.file([
                'server/config/mappings.json'
            ]);
            assert.file([
                'server/localdev-config.json'
            ]);
    
        } else if (lang === "JAVA" || lang === "SPRING") {
            assert.file([
                'src/main/resources/mappings.json'
            ]);
            assert.file([
                'src/main/resources/localdev-config.json'
            ]);
    
        } else if (lang === "SWIFT") {
            assert.file([
                'config/mappings.json'
            ]);
            assert.file([
                'config/localdev-config.json'
            ]);
    
        } else if (lang === "GO") {
            assert.file([
                'server/config/mappings.json'
            ]);
            assert.file([
                'server/localdev-config.json'
            ]);
        }
    });
}

describe("cloud-assets:service", function() {
    this.timeout(120000);
    console.log("beginning test suites");
    const test_dir = path.join(__dirname, './tmp');
    const main_gen = path.join(__dirname, '../generators/app');

    _.forEach(SERVICES, (service) => {
        _.forEach(Object.keys(DEPLOY_OBJECTS), (deploy_type) => {
            const goLang = "GO";
            describe(`cloud-assets:service-${service} with ${goLang} project deployed with ${deploy_type}`, function () {
                console.log(`beginning test suite ${this.title}`);
                let go_payload = testUtils.generateTestPayload(deploy_type, goLang, [service]);
                beforeEach(function () {
                    return helpers.run(main_gen)
                        .inTmpDir(function (dir) {
                        })
                        .withOptions({deploy_options: JSON.stringify(go_payload.deploy_options),
                                        application: JSON.stringify(go_payload.application)});
                });

                validateDeployAssets(goLang, deploy_type, service, go_payload.application.name);
                validateCreds(goLang, service);
        
                it('Gopkg.toml with Cloud Env', function () {
                    assert.file([
                        'Gopkg.toml'
                    ]);
                    assert.fileContent('Gopkg.toml', 'name = "github.com/ibm-developer/ibm-cloud-env-golang"');
                });
            });

            const nodeLang = "NODE";
            describe(`cloud-assets:service-${service} with ${nodeLang} project deployed with ${deploy_type}`, function () {
                console.log(`beginning test suite ${this.title}`);
                let node_payload = testUtils.generateTestPayload(deploy_type, nodeLang, [service]);
                beforeEach(function () {
                    return helpers.run(main_gen)
                        .inTmpDir(function (dir) {
                        })
                        .withOptions({deploy_options: JSON.stringify(node_payload.deploy_options),
                                        application: JSON.stringify(node_payload.application)});
                });

                validateDeployAssets(nodeLang, deploy_type, service, node_payload.application.name);
                validateCreds(nodeLang, service);
        
                it('package.json with Cloud Env', function () {
                    assert.file([
                        'package.json'
                    ]);
                    assert.fileContent('package.json', '"ibm-cloud-env": "^0"');
                });
            });
            
            const pythonLang = "PYTHON";
            describe(`cloud-assets:service-${service} with ${pythonLang} project deployed with ${deploy_type}`, function () {
                console.log(`beginning test suite ${this.title}`);
                let python_payload = testUtils.generateTestPayload(deploy_type, pythonLang, [service]);
                beforeEach(function () {
                    return helpers.run(main_gen)
                        .inTmpDir(function (dir) {
                        })
                        .withOptions({deploy_options: JSON.stringify(python_payload.deploy_options),
                                        application: JSON.stringify(python_payload.application)});
                });

                validateDeployAssets(pythonLang, deploy_type, service, python_payload.application.name);
                validateCreds(pythonLang, service);
        
                it('Pipfile with Cloud Env', function () {
                    assert.file([
                        'Pipfile'
                    ]);
                    assert.fileContent('Pipfile', 'ibmcloudenv =\'~=0.0\'');
                    assert.fileContent('Pipfile', 'livereload =\'*\'');
                });
        
                it('requirements.txt with Cloud Env', function () {
                    assert.file([
                        'requirements.txt'
                    ]);
                    assert.fileContent('requirements.txt', 'ibmcloudenv');
                    assert.fileContent('requirements.txt', 'livereload');
                });
            });
            
            const javaLang = "JAVA";
            describe(`cloud-assets:service-${service} with ${javaLang} project deployed with ${deploy_type}`, function () {
                console.log(`beginning test suite ${this.title}`);
                let java_payload = testUtils.generateTestPayload(deploy_type, javaLang, [service]);
                beforeEach(function () {
                    return helpers.run(main_gen)
                        .inTmpDir(function (dir) {
                            fse.copySync(path.join(__dirname, `/templates/${javaLang.toLowerCase()}`), dir);
                        })
                        .withOptions({deploy_options: JSON.stringify(java_payload.deploy_options),
                                        application: JSON.stringify(java_payload.application)});
                });

                validateDeployAssets(javaLang, deploy_type, service, java_payload.application.name);
                validateCreds(javaLang, service);
        
                it('pom.xml with Cloud Env', function () {
                    assert.file([
                        'pom.xml'
                    ]);
                    assert.fileContent('pom.xml', '<artifactId>javax.json-api</artifactId>');
                    assert.fileContent('pom.xml', '<artifactId>com.ibm.websphere.appserver.api.json</artifactId>');
                    assert.fileContent('pom.xml', '<artifactId>cdi-api</artifactId>');
                    assert.fileContent('pom.xml', '<artifactId>json-path</artifactId>');
                    assert.fileContent('pom.xml', '<artifactId>microprofile-config-api</artifactId>');
                });
            });
            
            const springLang = "SPRING";
            describe(`cloud-assets:service-${service} with ${springLang} project deployed with ${deploy_type}`, function () {
                console.log(`beginning test suite ${this.title}`);
                let spring_payload = testUtils.generateTestPayload(deploy_type, springLang, [service]);
                beforeEach(function () {
                    return helpers.run(main_gen)
                        .inTmpDir(function (dir) {
                            fse.copySync(path.join(__dirname, `/templates/${springLang.toLowerCase()}`), dir);
                        })
                        .withOptions({deploy_options: JSON.stringify(spring_payload.deploy_options),
                                        application: JSON.stringify(spring_payload.application)});
                });

                validateDeployAssets(springLang, deploy_type, service, spring_payload.application.name);
                validateCreds(springLang, service);
        
                it('pom.xml with Cloud Env', function () {
                    assert.file([
                        'pom.xml'
                    ]);
                    assert.fileContent('pom.xml', '<artifactId>javax.json-api</artifactId>');
                    assert.fileContent('pom.xml', '<artifactId>json-path</artifactId>');
                    assert.fileContent('pom.xml', '<artifactId>ibm-cloud-spring-boot-service-bind</artifactId>');
                    assert.fileContent('pom.xml', '<artifactId>microprofile-config-api</artifactId>');
                });
            });

            const swiftLang = "SWIFT";
            describe(`cloud-assets:service-${service} with ${swiftLang} project deployed with ${deploy_type}`, function () {
                console.log(`beginning test suite ${this.title}`);
                let swift_payload = testUtils.generateTestPayload(deploy_type, swiftLang, [service]);
                beforeEach(function () {
                    return helpers.run(main_gen)
                        .inTmpDir(function (dir) {
                            fse.copySync(path.join(__dirname, `/templates/${swiftLang.toLowerCase()}`), dir);
                        })
                        .withOptions({deploy_options: JSON.stringify(swift_payload.deploy_options),
                                        application: JSON.stringify(swift_payload.application)});
                });

                validateDeployAssets(swiftLang, deploy_type, service, swift_payload.application.name);
                validateCreds(swiftLang, service);
        
                it('Package.swift with Cloud Env', function () {
                    assert.file([
                        'Package.swift'
                    ]);
                    assert.fileContent('Package.swift', '.package(url: "https://github.com/IBM-Swift/CloudEnvironment.git", from: "9.1.0")');
                });
            });
        });
    });
});