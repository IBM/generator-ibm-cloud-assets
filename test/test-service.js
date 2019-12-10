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
const fse = require('fs-extra');

const SERVICES = utils.SERVICES;
const DEPLOY_OBJECTS = utils.baseDeployObjects;

function validateHelmChart(lang, deploy_type, service) {

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

function validateDeployAssets(lang, deploy_type, services) {
    it('validateDeployAssets', function () {
        if (deploy_type === "knative") {
            validateKnativeService(lang, deploy_type, services);
        } else if (deploy_type === "helm") {
            validateHelmChart(lang, deploy_type, services);
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
    this.timeout(60000);
    console.log("beginning test suites");

    _.forEach(SERVICES, (service) => {
        _.forEach(Object.keys(DEPLOY_OBJECTS), (deploy_type) => {
            let lang = "NODE";
            let node_payload = utils.generateTestPayload(deploy_type, lang, [service]);
            describe(`cloud-assets:service-${service} with ${lang} project deployed with ${deploy_type}`, function () {
                console.log(`beginning test suite ${this.title}`);
                beforeEach(function () {
                    return helpers.run(path.join(__dirname, '../generators/app'))
                        .inDir(path.join(__dirname, './tmp'))
                        .withOptions({deploy_options: JSON.stringify(node_payload.deploy_options),
                                        application: JSON.stringify(node_payload.application)});
                });

                validateDeployAssets(lang, deploy_type, service);
                validateCreds(lang, service);
        
                it('package.json with Cloud Env', function () {
                    assert.file([
                        'package.json'
                    ]);
                    assert.fileContent('package.json', '"ibm-cloud-env": "^0"');
                });
            });
            
            lang = "PYTHON";
            let python_payload = utils.generateTestPayload(deploy_type, lang, [service]);
            describe(`cloud-assets:service-${service} with ${lang} project deployed with ${deploy_type}`, function () {
                console.log(`beginning test suite ${this.title}`);
                beforeEach(function () {
                    return helpers.run(path.join(__dirname, '../generators/app'))
                        .inDir(path.join(__dirname, './tmp'))
                        .withOptions({deploy_options: JSON.stringify(python_payload.deploy_options),
                                        application: JSON.stringify(python_payload.application)});
                });

                validateDeployAssets(lang, deploy_type, service);
                validateCreds(lang, service);
        
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
            
            lang = "JAVA";
            let java_payload = utils.generateTestPayload(deploy_type, lang, [service]);
            describe(`cloud-assets:service-${service} with ${lang} project deployed with ${deploy_type}`, function () {
                console.log(`beginning test suite ${this.title}`);
                beforeEach(function () {
                    fse.copySync(`./templates/${lang.toLowerCase()}/`, './tmp');
                    return helpers.run(path.join(__dirname, '../generators/app'))
                        .inDir(path.join(__dirname, './tmp'))
                        .withOptions({deploy_options: JSON.stringify(java_payload.deploy_options),
                                        application: JSON.stringify(java_payload.application)});
                });

                validateDeployAssets(lang, deploy_type, service);
                validateCreds(lang, service);
        
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
            
            lang = "SPRING";
            let spring_payload = utils.generateTestPayload(deploy_type, lang, [service]);
            describe(`cloud-assets:service-${service} with ${lang} project deployed with ${deploy_type}`, function () {
                console.log(`beginning test suite ${this.title}`);
                beforeEach(function () {
                    fse.copySync(`./templates/${lang.toLowerCase()}/`, './tmp');
                    return helpers.run(path.join(__dirname, '../generators/app'))
                        .inDir(path.join(__dirname, './tmp'))
                        .withOptions({deploy_options: JSON.stringify(spring_payload.deploy_options),
                                        application: JSON.stringify(spring_payload.application)});
                });

                validateDeployAssets(lang, deploy_type, service);
                validateCreds(lang, service);
        
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

            lang = "SWIFT";
            let swift_payload = utils.generateTestPayload(deploy_type, lang, [service]);
            describe(`cloud-assets:service-${service} with ${lang} project deployed with ${deploy_type}`, function () {
                console.log(`beginning test suite ${this.title}`);
                beforeEach(function () {
                    fse.copySync(`./templates/${lang.toLowerCase()}/`, './tmp');
                    return helpers.run(path.join(__dirname, '../generators/app'))
                        .inDir(path.join(__dirname, './tmp'))
                        .withOptions({deploy_options: JSON.stringify(swift_payload.deploy_options),
                                        application: JSON.stringify(swift_payload.application)});
                });

                validateDeployAssets(lang, deploy_type, service);
                validateCreds(lang, service);
        
                it('Package.swift with Cloud Env', function () {
                    assert.file([
                        'Package.swift'
                    ]);
                    assert.fileContent('Package.swift', '.package(url: "https://github.com/IBM-Swift/CloudEnvironment.git", from: "9.1.0")');
                });
            });

            lang = "GO";
            let go_payload = utils.generateTestPayload(deploy_type, lang, [service]);
            describe(`cloud-assets:service-${service} with ${lang} project deployed with ${deploy_type}`, function () {
                console.log(`beginning test suite ${this.title}`);
                beforeEach(function () {
                    return helpers.run(path.join(__dirname, '../generators/app'))
                        .inDir(path.join(__dirname, './tmp'))
                        .withOptions({deploy_options: JSON.stringify(go_payload.deploy_options),
                                        application: JSON.stringify(go_payload.application)});
                });

                validateDeployAssets(lang, deploy_type, service);
                validateCreds(lang, service);
        
                it('Gopkg.toml with Cloud Env', function () {
                    assert.file([
                        'Gopkg.toml'
                    ]);
                    assert.fileContent('Gopkg.toml', 'name = "github.com/ibm-developer/ibm-cloud-env-golang"');
                });
            });
        });
    });
});