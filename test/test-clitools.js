/*
 © Copyright IBM Corp. 2019, 2020
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
const path = require('path');
const utils = require('./test-utils')

describe('cloud-assets:clitools', function () {
	this.timeout(1000*60*10);

	describe('cloud-assets:clitools with Swift Kitura project', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(utils.generateTestPayload("helm", "SWIFT", ['appid', 'cloudant']));
		});
		let applicationName = `testgenv2apphelmswift`;

		it('create cli-config for CLI tool', function () {
			assert.file(['cli-config.yml']);
			assert.fileContent('cli-config.yml', `chart-path : "chart/${applicationName.toLowerCase()}"`);
			assert.fileContent('cli-config.yml', 'run-cmd : ""');
			assert.fileContent('cli-config.yml', 'container-port-map-debug : "2048:1024,2049:1025"');
			assert.fileContent('cli-config.yml', 'dockerfile-run : "Dockerfile"');
			assert.fileContent('cli-config.yml', 'dockerfile-tools : "Dockerfile-tools"');
		});

		it('should have the chart-path property set in cli-config.yml', function () {
			assert.fileContent('cli-config.yml', `chart-path : "chart/${applicationName.toLowerCase()}"`);
		});

		it('no swift-build-linux file', function () {
			assert.noFile([
				'.swift-build-linux'
			]);
		});

		it('no swift-test-linux file', function () {
			assert.noFile([
				'.swift-test-linux'
			]);
		});
	});

	describe('cloud-assets:clitools with NodeJS project', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(utils.generateTestPayload("knative", "NODE", ['appid', 'cloudant']))
		});

		let applicationName = `testgenv2appknativenode`;

		it('create Dockerfile for running', function () {
			assert.file('cli-config.yml');
		});

		it('should have Dockerfile and Dockerfile-tools as the docker run commands', function() {
			assert.fileContent('cli-config.yml', 'dockerfile-run : "Dockerfile"');
			assert.fileContent('cli-config.yml', 'dockerfile-tools : "Dockerfile-tools"');
		});

		it('should have the correct run, stop and debug cmds for containers', function() {
			assert.fileContent('cli-config.yml', 'debug-cmd : "npm run debug"');
			assert.fileContent('cli-config.yml', 'stop-cmd : "npm stop"');
		});

		it('has correct default port', function () {
			assert.fileContent('cli-config.yml', '3000:3000');
		});

		it('should have the chart-path property set in cli-config.yml', function () {
			assert.fileContent('cli-config.yml', `chart-path : "chart/${applicationName.toLowerCase()}"`);
		});
	});

	/* Common Java Project characteristics: Spring or Liberty, maven or gradle */
	let javaFrameworks = ['JAVA', 'SPRING'];
	javaFrameworks.forEach(language => {
		describe('cloud-assets:clitools for ['+ language +'] project', function () {
			let applicationName = `testgenv2apphelm${language}`;

			beforeEach(function () {
				return helpers.run(path.join(__dirname, '../generators/app'))
					.inDir(path.join(__dirname, './tmp'))
					.withOptions(utils.generateTestPayload("helm", language, ['appid', 'cloudant']))
			});

			it('create cli-config for CLI tool', function () {
				assert.file('cli-config.yml');
				assert.fileContent('cli-config.yml', 'ibm-cloud-app-id : ')
			});
			it('create cli-config chart path includes application name', function () {
				assert.fileContent('cli-config.yml', `chart-path : "chart/${applicationName.toLowerCase()}"`);
			});
			it('CLI config references maven', function () {
				assert.fileContent('cli-config.yml', 'maven');
				assert.noFileContent('cli-config.yml', 'gradle');
			});
		});
	});

	describe('cloud-assets:clitools with Python project', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(utils.generateTestPayload("knative", "PYTHON", ['appid', 'cloudant']))
		});

		it('should have Dockerfile and Dockerfile-tools as the docker run commands', function() {
			assert.fileContent('cli-config.yml', 'dockerfile-run : "Dockerfile"');
			assert.fileContent('cli-config.yml', 'dockerfile-tools : "Dockerfile-tools"');
		});

		it('create CLI-config file', function () {
			assert.file(['cli-config.yml']);
			assert.fileContent('cli-config.yml', 'python manage.py');
			assert.fileContent('cli-config.yml', 'testgenv2appknativepython-flask-run');
			assert.fileContent('cli-config.yml', `chart-path : "chart/testgenv2appknativepython"`);
		});

	});

	describe('cloud-assets:clitools with Python project with no services', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(utils.generateTestPayload("knative", "PYTHON", ['appid', 'cloudant']))
		});
		
		it('create CLI-config file', function () {
			assert.file(['cli-config.yml']);
			assert.fileContent('cli-config.yml', 'python manage.py');
			assert.fileContent('cli-config.yml', 'testgenv2appknativepython-flask-run');
			assert.fileContent('cli-config.yml', `chart-path : "chart/testgenv2appknativepython"`);
		});

	});

	describe('cloud-assets:clitools with Django project', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(utils.generateTestPayload("knative", "DJANGO", ['appid', 'cloudant']))
		});

		it('create CLI-config file', function () {
			assert.file(['cli-config.yml']);
			assert.fileContent('cli-config.yml', 'python manage.py runserver --noreload');
			assert.fileContent('cli-config.yml', 'testgenv2appknativedjango-django-run');
			assert.fileContent('cli-config.yml', `chart-path : "chart/testgenv2appknativedjango"`);
			assert.fileContent('cli-config.yml', 'dockerfile-run : "Dockerfile"');
			assert.fileContent('cli-config.yml', 'dockerfile-tools : "Dockerfile-tools"');
		});

	});


	describe('cloud-assets:clitools with Go project', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(utils.generateTestPayload("knative", "GO", ['appid', 'cloudant']))
		});

		it('should have Dockerfile and Dockerfile-tools as the docker run commands', function() {
			assert.fileContent('cli-config.yml', 'dockerfile-run : "Dockerfile"');
			assert.fileContent('cli-config.yml', 'dockerfile-tools : "Dockerfile-tools"');
		});

		it('should have the correct build, test and debug cmds for containers', function() {
			assert.fileContent('cli-config.yml', 'build-cmd-run : "go build"');
			assert.fileContent('cli-config.yml', 'debug-cmd : "dlv debug --headless --listen=0.0.0.0:8181"');
			assert.fileContent('cli-config.yml', 'test-cmd : "go test ./..."');
		});

		it('has correct default port', function () {
			assert.fileContent('cli-config.yml', '8080:8080');
		});

		it('should have the chart-path property set in cli-config.yml', function () {
			assert.fileContent('cli-config.yml', `chart-path : "chart/testgenv2appknativego"`);
		});
	});

	['IOS_SWIFT', 'ANDROID'].forEach( language => {
		describe(`cloud-assets:clitools with ${language} project`, function () {
			beforeEach(function () {
				return helpers.run(path.join(__dirname, '../generators/app'))
					.inDir(path.join(__dirname, './tmp'))
					.withOptions(utils.generateTestPayload("none", language, ['appid', 'cloudant']))
			});
	
			it('mobile should have no cli-config', function() {
				assert.noFile('cli-config.yml')
			});
		});
	});
});
