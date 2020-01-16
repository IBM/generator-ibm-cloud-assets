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

const Log4js = require('log4js');
const logger = Log4js.getLogger('generator-ibm-cloud-assets:test-service');
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

const SvcInfo = require('../generators/service/templates/serviceInfo.json');

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
    
    assert.fileContent(chartLocation + '/templates/deployment.yaml', `service_${SvcInfo[service]["customServiceKey"].replace(/-/g, '_')}`);
    assert.fileContent(chartLocation + '/templates/deployment.yaml', `.Values.services.${service}.secretKeyRef`);
    assert.fileContent(valuesFile, `my-service-${service}`);
}

function validateKnativeService(lang, deploy_type, service) {
    assert.file([
        'service.yaml'
    ]);
    
    assert.fileContent('service.yaml', `service_${SvcInfo[service]["customServiceKey"].replace(/-/g, '_')}`);
    assert.fileContent('service.yaml', `my-service-${service.toLowerCase()}`);
}

function validateCF(lang, deploy_type, service, applicationName) {
    assert.file([
        'manifest.yml'
    ]);
    assert.fileContent('manifest.yml', testUtils.PREFIX_SVC_BINDING_NAME + service);
    assert.fileContent('manifest.yml', 'name: ' + utils.sanitizeAlphaNumLowerCase(applicationName));
}

function validateDeployAssets(lang, deploy_type, service) {
    let applicationName = `test-genv2-app-${deploy_type}-${lang}`;
    it('validateDeployAssets', function () {
        if (deploy_type === "knative") {
            validateKnativeService(lang, deploy_type, service);
        } else if (deploy_type === "helm") {
            validateHelmChart(lang, deploy_type, service, applicationName);
        } else {
            validateCF(lang, deploy_type, service, applicationName);
        }
    });
}

function validateCreds(lang, services) {
    it('mappings.json and localdev-config.json exist', function () {
        var mappings_path = "";
        var localdev_path = "";
        if (lang === "NODE") {
            mappings_path = 'server/config/mappings.json';
            localdev_path = 'server/localdev-config.json';
    
        } else if (lang === "PYTHON") {
            mappings_path = 'server/config/mappings.json';
            localdev_path = 'server/localdev-config.json';
    
        } else if (lang === "JAVA" || lang === "SPRING") {
            mappings_path = 'src/main/resources/mappings.json';
            localdev_path = 'src/main/resources/localdev-config.json';
    
        } else if (lang === "SWIFT") {
            mappings_path = 'config/mappings.json';
            localdev_path = 'config/localdev-config.json';
    
        } else if (lang === "GO") {
            mappings_path = 'server/config/mappings.json';
            localdev_path = 'server/localdev-config.json';
        }
        assert.file([mappings_path]);
        // these language and service combos are not supported
        if (lang !== "SWIFT" && services !== "cloudObjectStorage" && services !== "db2OnCloud" && services !== "conversation"
            && services !== "discovery" && services !== "languageTranslator" && services !== "naturalLanguageClassifier"
            && services !== "naturalLanguageUnderstanding" && services !== "personalityInsights" && services !== "speechToText"
            && services !== "textToSpeech" && services != "toneAnalyzer" && services !== "visualRecognition") {
            assert.fileContent(mappings_path, testUtils.PREFIX_SVC_BINDING_NAME + services);
        }
        assert.file([localdev_path]);
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
                beforeEach(function () {
                    return helpers.run(main_gen)
                        .inTmpDir(function (dir) {
                            console.log(`generator temp dir: ${dir}`);
                        })
                        .withOptions(testUtils.generateTestPayload(deploy_type, goLang, [service]));
                });

                validateDeployAssets(goLang, deploy_type, service);
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
                beforeEach(function () {
                    return helpers.run(main_gen)
                        .inTmpDir(function (dir) {
                            console.log(`generator temp dir: ${dir}`);
                        })
                        .withOptions(testUtils.generateTestPayload(deploy_type, nodeLang, [service]));
                });

                validateDeployAssets(nodeLang, deploy_type, service);
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
                beforeEach(function () {
                    return helpers.run(main_gen)
                        .inTmpDir(function (dir) {
                            console.log(`generator temp dir: ${dir}`);
                        })
                        .withOptions(testUtils.generateTestPayload(deploy_type, pythonLang, [service]));
                });

                validateDeployAssets(pythonLang, deploy_type, service);
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
                beforeEach(function () {
                    return helpers.run(main_gen)
                        .inTmpDir(function (dir) {
                            console.log(`generator temp dir: ${dir}`);
                            fse.copySync(path.join(__dirname, `/templates/${javaLang.toLowerCase()}`), dir);
                        })
                        .withOptions(testUtils.generateTestPayload(deploy_type, javaLang, [service]));
                });

                validateDeployAssets(javaLang, deploy_type, service);
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
                beforeEach(function () {
                    return helpers.run(main_gen)
                        .inTmpDir(function (dir) {
                            console.log(`generator temp dir: ${dir}`);
                            fse.copySync(path.join(__dirname, `/templates/${springLang.toLowerCase()}`), dir);
                        })
                        .withOptions(testUtils.generateTestPayload(deploy_type, springLang, [service]));
                });

                validateDeployAssets(springLang, deploy_type, service);
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
                beforeEach(function () {
                    return helpers.run(main_gen)
                        .inTmpDir(function (dir) {
                            console.log(`generator temp dir: ${dir}`);
                            fse.copySync(path.join(__dirname, `/templates/${swiftLang.toLowerCase()}`), dir);
                        })
                        .withOptions(testUtils.generateTestPayload(deploy_type, swiftLang, [service]));
                });

                validateDeployAssets(swiftLang, deploy_type, service);
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
