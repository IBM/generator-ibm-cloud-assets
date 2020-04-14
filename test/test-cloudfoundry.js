/*
 © Copyright IBM Corp. 2017, 2018
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
const utils = require('./test-utils');
const path = require('path');
const yml = require('js-yaml');
const fs = require('fs');
const _ = require('lodash');

const optionsNode = utils.generateTestPayload("cf", "NODE", ['appid', 'cloudant']);
const optionsSwift = utils.generateTestPayload("cf", "SWIFT", ['appid', 'cloudant']);
const optionsJava = utils.generateTestPayload("cf", "JAVA", ['appid', 'cloudant']);
const optionsSpring = utils.generateTestPayload("cf", "SPRING", ['appid', 'cloudant']);
const optionsJavaNoServices = utils.generateTestPayload("cf", "JAVA", []);
const optionsPython = utils.generateTestPayload("cf", "PYTHON", ['appid', 'cloudant']);
const optionsDjango = utils.generateTestPayload("cf", "DJANGO", ['appid', 'cloudant']);
const optionsGo = utils.generateTestPayload("cf", "GO", ['appid', 'cloudant']);

describe('cloud-enablement:cloudfoundry', function () {
	this.timeout(5000);

	describe('cloud-enablement:cloudfoundry with Python', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(optionsPython);
		});

		it('manifest.yml has memory', function () {
			assert.file('manifest.yml');
			assert.fileContent('manifest.yml', 'memory: 256M');
		});

	});

	describe('cloud-enablement:cloudfoundry with Django', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(optionsDjango);
		});

		it('manifest.yml has memory', function () {
			assert.file('manifest.yml');
			assert.fileContent('manifest.yml', 'memory: 256M');
		});

	});

	describe('cloud-enablement:cloudfoundry with Swift', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(optionsSwift);
		});

		it('manifest.yml has memory', function () {
			assert.file('manifest.yml');
			assert.fileContent('manifest.yml', 'memory: 256M');
		});

		it('manifest.yml has SWIFT_BUILD_DIR_CACHE set to false', function () {
			assert.file('manifest.yml');
			assert.fileContent('manifest.yml', 'SWIFT_BUILD_DIR_CACHE : false');
		});

	});

	describe('cloud-enablement:cloudfoundry with Node', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(optionsNode);
		});

		it('manifest.yml has memory', function () {
			assert.file('manifest.yml');
			assert.fileContent('manifest.yml', 'memory: 256M');
		});

	});

	describe('cloud-enablement:cloudfoundry with Go', function () {
		let options = optionsGo;
		options.deploy_options.cloud_foundry.memory = '1024M';
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(options);
		});

		it('manifest.yml has memory', function () {
			assert.file('manifest.yml');
			assert.fileContent('manifest.yml', 'memory: 1024M');
		});

	});

	let javaFrameworks = ['JAVA', 'SPRING'];
	let buildType = 'maven';
	let createTypes = ['enable/', 'microservice'];

	let assertYmlContent = function(actual, expected, label) {
		assert.strictEqual(actual, expected, 'Expected ' + label + ' to be ' + expected + ', found ' + actual);
	}
	javaFrameworks.forEach(language => {
		createTypes.forEach(createType => {

			describe('cloud-enablement:cloudfoundry with ' + language + ' with buildType ' + buildType + ' and createType ' + createType, function () {
				let baseOptions = language === 'SPRING' ? optionsSpring : optionsJava;
				baseOptions.deploy_options.cloud_foundry.memory = '512M'
				let artifactId = '${CF_APP}';
				let javaVersion = '1.0-SNAPSHOT';

				let options = _.extend(baseOptions, {buildType : buildType, createType: createType, artifactId: artifactId, version: javaVersion});
				if (language === 'libertyBeta') {
					options.libertyVersion = 'beta'
				}

				beforeEach(function () {
					return helpers.run(path.join(__dirname, '../generators/app'))
						.inDir(path.join(__dirname, './tmp'))
						.withOptions(options)
				});

				it('manifest.yml is generated with correct content', function () {
					assert.file('manifest.yml');
					let manifestyml = yml.safeLoad(fs.readFileSync('manifest.yml', 'utf8'));

					if (language === 'JAVA' || language === 'libertyBeta') {
						let targetDir = buildType === 'maven' ? 'target' : 'build'
						assertYmlContent(manifestyml.applications[0].path, './' + targetDir + '/' + artifactId + '-' + javaVersion +'.zip', 'manifestyml.applications[0].path');
						assertYmlContent(manifestyml.applications[0].memory, '512M', 'manifestyml.applications[0].memory')
						assertYmlContent(manifestyml.applications[0].buildpack, 'liberty-for-java', 'manifestyml.applications[0].buildpack')
					}

					if (language === 'JAVA') {
						assertYmlContent(manifestyml.applications[0].env.IBM_LIBERTY_BETA, undefined, 'manifestyml.applications[0].env.IBM_LIBERTY_BETA')
						assertYmlContent(manifestyml.applications[0].env.JBP_CONFIG_LIBERTY, undefined, 'manifestyml.applications[0].env.JBP_CONFIG_LIBERTY')
					}

					if (language === 'libertyBeta') {
						assertYmlContent(manifestyml.applications[0].env.IBM_LIBERTY_BETA, true, 'manifestyml.applications[0].env.IBM_LIBERTY_BETA')
						assertYmlContent(manifestyml.applications[0].env.JBP_CONFIG_LIBERTY, 'version: +', 'manifestyml.applications[0].env.JBP_CONFIG_LIBERTY')
					}

					if ( language === 'SPRING' ) {
						let targetDir = buildType === 'maven' ? 'target' : 'build/libs'
						assertYmlContent(manifestyml.applications[0].path, './'+targetDir+'/' + artifactId + '-'+javaVersion+'.jar', 'manifestyml.applications[0].path');
						assertYmlContent(manifestyml.applications[0].memory, '512M', 'manifestyml.applications[0].memory')
						assertYmlContent(manifestyml.applications[0].buildpack, 'java_buildpack', 'manifestyml.applications[0].buildpack')
					}
				});

				it('.cfignore file is generated and has base content', function () {
					assert.file('.cfignore');
					if(language === 'JAVA' || language === 'libertyBeta') {
						assert.fileContent('.cfignore', '/src/main/liberty/config/server.env');
					} else /* language === 'SPRING' */ {
						assert.fileContent('.cfignore', '/src/main/resources/application-local.properties');
					}
					['Dockerfile', 'Dockerfile-tools', '.dockerignore', '.git/', '.github/', '.gitignore'].forEach( ignoreFile => {
						assert.fileContent('.cfignore', ignoreFile);
					})
				});
			});
		})
	});

	describe('cloud-enablement:cloudfoundry with java-liberty with NO services', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(optionsJavaNoServices);
		});

		it('manifest.yml is generated with correct content', function () {
			assert.file('manifest.yml');
			let manifestyml = yml.safeLoad(fs.readFileSync('manifest.yml', 'utf8'));
			if(manifestyml.applications[0].env) {
				assertYmlContent(manifestyml.applications[0].env.services_autoconfig_excludes, undefined, 'manifestyml.applications[0].env.services_autoconfig_excludes');
			}
		});
	});

	describe('cloud-enablement:cloudfoundry with java-liberty with platforms array specified', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(_.extend(optionsJava, {platforms: ['bluemix']}));
		});

		it('no cloud foundry files should be created', function () {
			assert.file('manifest.yml');
			assert.file('.cfignore');
		});
	});

});
