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

const utils = require('../generators/lib/utils');
const testUtils = require('./test-utils');
const fs = require('fs');
const SERVICES = testUtils.SERVICES;
const DEPLOY_OBJECTS = testUtils.generateDeployOpts();

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
		if (deploy_type === "helm") {
			validateHelmChart(lang, deploy_type, service, applicationName);
		} else if (deploy_type === "cf") {
			validateCF(lang, deploy_type, service, applicationName);
		}
	});
}

function validateCreds(lang, service) {
	it('mappings.json and localdev-config.json exist', function () {
		let mappings_path = "";
		let localdev_path = "";
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
		assert.file([mappings_path, localdev_path]);
		// these language and service combos are not supported
		if (lang !== "SWIFT" && !["cloudObjectStorage", "db2OnCloud", "conversation"
			, "discovery" , "languageTranslator" , "naturalLanguageClassifier"
			, "naturalLanguageUnderstanding" , "personalityInsights" , "speechToText"
			, "textToSpeech", "toneAnalyzer" , "visualRecognition"].includes(service)) {
			// assert.fileContent(mappings_path, testUtils.PREFIX_SVC_BINDING_NAME + services);
			assert.fileContent(mappings_path, service.replace(/-/g, '_'));
		}

		if (lang == "SWIFT") {
			//ensure that mappings.json _transformCredentialsOutputSwift has occured
			assert.noFileContent(mappings_path, `"version": 1,`);
		}
	});
}

function validateCredsMobile(lang, service) {
	let credentials_path = ""
	let mappings_and_configs_paths = ['server/config', 'server', 'src/main/resources', 'config']
	it('mobile mappings.json and localdev-config.json dont exist', function () {
		mappings_and_configs_paths.forEach( path => {
			assert.noFile(`${path}/localdev-config.json`)
			assert.noFile(`${path}/mappings.json`)
		})
	})
	if (lang == "IOS_SWIFT") {
		credentials_path = 'iosapp/BMSCredentials.plist'
	} else if (lang == "ANDROID") {
		credentials_path = `app/src/main/res/values/credentials.xml`
	}
	it( 'contains credential file with reference to service', function () {
		assert.file(credentials_path);
		assert.fileContent(credentials_path, `${service}`)
	})
}


describe("cloud-assets:service", function() {
	this.timeout(120000);
	logger.debug("beginning test suites");
	const main_gen = path.join(__dirname, '../generators/app');
	_.forEach(SERVICES, (service) => {
		_.forEach(Object.keys(DEPLOY_OBJECTS), (deploy_type) => {
			const goLang = "GO";
			describe(`cloud-assets:service-${service} with ${goLang} project deployed with ${deploy_type}`, function () {
				logger.debug(`beginning test suite ${this.title}`);
				beforeEach(function () {
					return helpers.run(main_gen)
						.inTmpDir(function (dir) {
							logger.debug(`generator temp dir: ${dir}`);
						})
						.withOptions(testUtils.generateTestPayload(deploy_type, goLang, [service]));
				});

				validateDeployAssets(goLang, deploy_type, service);
				validateCreds(goLang, service);

				it('Gopkg.toml not created', function () {
					assert.noFile([
						'Gopkg.toml'
					]);
				});
			});

			const nodeLang = "NODE";
			describe(`cloud-assets:service-${service} with ${nodeLang} project deployed with ${deploy_type}`, function () {
				logger.debug(`beginning test suite ${this.title}`);
				beforeEach(function () {
					return helpers.run(main_gen)
						.inTmpDir(function (dir) {
							logger.debug(`generator temp dir: ${dir}`);
						})
						.withOptions(testUtils.generateTestPayload(deploy_type, nodeLang, [service]));
				});

				validateDeployAssets(nodeLang, deploy_type, service);
				validateCreds(nodeLang, service);

				it('package.json not created', function () {
					assert.noFile([
						'package.json'
					]);
				});
			});

			const pythonLang = "PYTHON";
			describe(`cloud-assets:service-${service} with ${pythonLang} project deployed with ${deploy_type}`, function () {
				logger.debug(`beginning test suite ${this.title}`);
				beforeEach(function () {
					return helpers.run(main_gen)
						.inTmpDir(function (dir) {
							logger.debug(`generator temp dir: ${dir}`);
						})
						.withOptions(testUtils.generateTestPayload(deploy_type, pythonLang, [service]));
				});

				validateDeployAssets(pythonLang, deploy_type, service);
				validateCreds(pythonLang, service);
			});

			const javaLang = "JAVA";
			describe(`cloud-assets:service-${service} with ${javaLang} project deployed with ${deploy_type}`, function () {
				logger.debug(`beginning test suite ${this.title}`);
				beforeEach(function () {
					return helpers.run(main_gen)
						.inTmpDir(function (dir) {
							logger.debug(`generator temp dir: ${dir}`);
						})
						.withOptions(testUtils.generateTestPayload(deploy_type, javaLang, [service]));
				});

				validateDeployAssets(javaLang, deploy_type, service);
				validateCreds(javaLang, service);
			});

			const springLang = "SPRING";
			describe(`cloud-assets:service-${service} with ${springLang} project deployed with ${deploy_type}`, function () {
				logger.debug(`beginning test suite ${this.title}`);
				beforeEach(function () {
					return helpers.run(main_gen)
						.inTmpDir(function (dir) {
							logger.debug(`generator temp dir: ${dir}`);
						})
						.withOptions(testUtils.generateTestPayload(deploy_type, springLang, [service]));
				});

				validateDeployAssets(springLang, deploy_type, service);
				validateCreds(springLang, service);
			});

			const swiftLang = "SWIFT";
			describe(`cloud-assets:service-${service} with ${swiftLang} project deployed with ${deploy_type}`, function () {
				logger.debug(`beginning test suite ${this.title}`);
				beforeEach(function () {
					return helpers.run(main_gen)
						.inTmpDir(function (dir) {
							logger.debug(`generator temp dir: ${dir}`);
						})
						.withOptions(testUtils.generateTestPayload(deploy_type, swiftLang, [service]));
				});

				validateDeployAssets(swiftLang, deploy_type, service);
				validateCreds(swiftLang, service);

				it('Package.swift not created', function () {
					assert.noFile([
						'Package.swift'
					]);
				});
			});
		});
	});


	["IOS_SWIFT", "ANDROID"].forEach(language => {
		SERVICES.forEach(service => {
			describe(`cloud-assets:service-${service} with ${language} project`, function () {
				logger.debug(`beginning test suite ${this.title}`);
				beforeEach( function () {
					return helpers.run(main_gen)
						.inTmpDir(function (dir) {
							logger.debug(`generator temp dir: ${dir}`);
							if (language == "IOS_SWIFT") {
								fs.mkdirSync(`${dir}/iosapp`, function (err) {logger.debug(err)})
							} else if (language == "ANDROID") {
								fs.mkdirSync(`${dir}/app/src/main/res/values/`, {recursive: true}, function (err) {logger.debug(err)})
							}
						})
						.withOptions(testUtils.generateTestPayload("none", language, [service]));
				});
				validateCredsMobile(language, service)
			});
		});
	});
});
