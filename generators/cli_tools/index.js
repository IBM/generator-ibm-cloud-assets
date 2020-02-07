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

'use strict';

const Log4js = require('log4js');
const logger = Log4js.getLogger('generator-ibm-cloud-assets:cli');
const Generator = require('yeoman-generator');
const Handlebars = require('../lib/handlebars.js');
const Utils = require('../lib/utils');
const xmljs = require('xml-js');

const FILENAME_CLI_CONFIG = "cli-config.yml";
const FILENAME_DEBUG = "run-debug";
const FILENAME_DEV = "run-dev";

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.opts = opts;
	}

	configuring() {
	}

	writing() {
		switch (this.opts.application.language) {
			case 'NODE':
				logger.trace("Generating CLI tools for NODE");
				this._generateNodeJS();
				break;
			case 'JAVA':
				logger.trace("Generating CLI tools for JAVA");
				this._generateJava();
				break;
			case 'SPRING':
				logger.trace("Generating CLI tools for SPRING");
				this._generateJava();
				break;
			case 'SWIFT':
				logger.trace("Generating CLI tools for SWIFT");
				this._generateSwift();
				break;
			case 'PYTHON':
				logger.trace("Generating CLI tools for PYTHON");
				this._generatePython();
				break;
			case 'DJANGO':
				logger.trace("Generating CLI tools for DJANGO");
				this._generateDjango();
				break;
			case 'GO':
				logger.trace("Generating CLI tools for GO");
				this._generateGo();
				break;
			default:
				throw new Error(`No language ${this.opts.application.language} found`);
		}
	}

	_generateSwift() {
		const applicationName = this.opts.application.sanitizedName;
		const executableName = this.opts.application.name;

		const cliConfig = {
			containerNameRun: `${applicationName.toLowerCase()}-swift-run`,
			containerNameTools: `${applicationName.toLowerCase()}-swift-tools`,
			hostPathRun: '.',
			hostPathTools: '.',
			containerPathRun: '/swift-project',
			containerPathTools: '/swift-project',
			containerPortMap: '8080:8080',
			containerPortMapDebug: '2048:1024,2049:1025',
			dockerFileRun: 'Dockerfile',
			dockerFileTools: 'Dockerfile-tools',
			imageNameRun: `${applicationName.toLowerCase()}-swift-run`,
			imageNameTools: `${applicationName.toLowerCase()}-swift-tools`,
			buildCmdRun: '/swift-utils/tools-utils.sh build release',
			testCmd: '/swift-utils/tools-utils.sh test',
			buildCmdDebug: '/swift-utils/tools-utils.sh build debug',
			runCmd: '',
			stopCmd: '',
			debugCmd: `/swift-utils/tools-utils.sh debug ${executableName} 1024`,
			chartPath: `chart/${applicationName.toLowerCase()}`,
			applicationId: `${this.opts.application.app_id}`
		};

		logger.trace(`Generating cli-config with cliConfig: ${JSON.stringify(cliConfig,null,3)}`  )
		this._writeHandlebarsFile('../templates/cli-config-common.yml', FILENAME_CLI_CONFIG, { cliConfig });
	}

	_generateNodeJS() {
		const applicationName = this.opts.application.sanitizedName;
		const port = this.opts.deploy_options.servicePorts.http;

		const cliConfig = {
			containerNameRun: `${applicationName.toLowerCase()}-express-run`,
			containerNameTools: `${applicationName.toLowerCase()}-express-tools`,
			hostPathRun: '.',
			hostPathTools: '.',
			containerPathRun: '/app',
			containerPathTools: '/app',
			containerPortMap: `${port}:${port}`,
			containerPortMapDebug: `9229:9229`,
			containerMountsRun: '"./node_modules_linux": "/app/node_modules"',
			containerMountsTools: '"./node_modules_linux": "/app/node_modules"',
			dockerFileRun: 'Dockerfile',
			dockerFileTools: 'Dockerfile-tools',
			imageNameRun: `${applicationName.toLowerCase()}-express-run`,
			imageNameTools: `${applicationName.toLowerCase()}-express-tools`,
			buildCmdRun: 'npm install',
			testCmd: 'npm run test',
			buildCmdDebug: 'npm install',
			runCmd: '',
			debugCmd: 'npm run debug',
			stopCmd: "npm stop",
			chartPath: `chart/${applicationName.toLowerCase()}`,
			applicationId: `${this.opts.application.app_id}`
		};

		logger.trace( `Generating cli-config with cliConfig: ${JSON.stringify(cliConfig,null,3)}` )
		this._writeHandlebarsFile('../templates/cli-config-common.yml', FILENAME_CLI_CONFIG, { cliConfig });

		this._copyTemplateIfNotExists(FILENAME_DEBUG, 'node/run-debug', {});

		this._copyTemplateIfNotExists(FILENAME_DEV, 'node/run-dev', {});
	}

	_generateJava() {
		if (!this.opts.artifactId) {
			try {
				const data = this.fs.read(this.destinationPath("pom.xml"));
				const pomJson = xmljs.xml2json(data, { compact: true, spaces: 4 })
				const pom = JSON.parse(pomJson);
				this.opts.artifactId = pom.project.artifactId._text;
			} catch (err) {
				// file not found
				this.opts.artifactId = "<replace-me-with-artifactId-from-pom.xml>";
			}
		} 

		if (!this.opts.appName) {
			this.opts.appName = this.opts.application.sanitizedName;
		}

		this.opts.appNameRefreshed = this.opts.application.sanitizedName.toLowerCase();
		this.opts.version = this.opts.version ? this.opts.version : "1.0-SNAPSHOT";

		this.opts.applicationId = `${this.opts.application.app_id}`;

		if (this.fs.exists(this.destinationPath(FILENAME_CLI_CONFIG))) {
			logger.trace(FILENAME_CLI_CONFIG, "already exists, skipping.");
		} else {
			this._writeHandlebarsFile(
				this.opts.application.language.toLowerCase() + '/cli-config.yml.template',
				FILENAME_CLI_CONFIG,
				this.opts
			);
		}
	}

	_generatePython() {
		const applicationName = this.opts.application.sanitizedName;
		const port = this.opts.deploy_options.servicePorts.http;

		const cliConfig = {
			containerNameRun: `${applicationName.toLowerCase()}-flask-run`,
			containerNameTools: `${applicationName.toLowerCase()}-flask-tools`,
			hostPathRun: '.',
			hostPathTools: '.',
			containerPathRun: '/app',
			containerPathTools: '/app',
			containerPortMap: `${port}:${port}`,
			containerPortMapDebug: '5858:5858',
			dockerFileRun: 'Dockerfile',
			dockerFileTools: 'Dockerfile-tools',
			imageNameRun: `${applicationName.toLowerCase()}-flask-run`,
			imageNameTools: `${applicationName.toLowerCase()}-flask-tools`,
			buildCmdRun: 'python manage.py build',
			testCmd: this.opts.enable
				? 'echo No test command specified in cli-config'
				: 'python manage.py test',
			buildCmdDebug: 'python manage.py build',
			runCmd: '',
			stopCmd: '',
			debugCmd: this.opts.enable
				? 'echo No debug command specified in cli-config'
				: 'python manage.py debug',
			chartPath: `chart/${applicationName.toLowerCase()}`,
			applicationId: `${this.opts.application.app_id}`
		};

		if (this.fs.exists(this.destinationPath(FILENAME_CLI_CONFIG))) {
			logger.trace(FILENAME_CLI_CONFIG, "already exists, skipping.");
		} else {
			logger.trace(`Generating cli-config with cliConfig: ${JSON.stringify(cliConfig,null,3)}`  )
			this._writeHandlebarsFile('cli-config-common.yml', FILENAME_CLI_CONFIG, { cliConfig });
		}

		if (this.fs.exists(this.destinationPath(FILENAME_DEV))) {
			logger.trace(FILENAME_DEV, "already exists, skipping.");
		} else {
			this._writeHandlebarsFile('python/run-dev', FILENAME_DEV, {
				port: port,
				enable: this.opts.enable,
				language: this.opts.application.language,
				name: this.opts.application.name
			});
		}
	}
	_generateDjango() {
		const applicationName = this.opts.application.sanitizedName;
		const port = this.opts.deploy_options.servicePorts.http;

		const cliConfig = {
			containerNameRun: `${applicationName.toLowerCase()}-django-run`,
			containerNameTools: `${applicationName.toLowerCase()}-django-tools`,
			hostPathRun: '.',
			hostPathTools: '.',
			containerPathRun: '/app',
			containerPathTools: '/app',
			containerPortMap: `${port}:${port}`,
			containerPortMapDebug: `5858:5858`,
			dockerFileRun: 'Dockerfile',
			dockerFileTools: 'Dockerfile-tools',
			imageNameRun: `${applicationName.toLowerCase()}-django-run`,
			imageNameTools: `${applicationName.toLowerCase()}-django-tools`,
			buildCmdRun: 'python -m compileall .',
			testCmd: this.opts.enable
				? 'echo No test command specified in cli-config'
				: 'python manage.py test',
			buildCmdDebug: 'python -m compileall .',
			runCmd: '',
			stopCmd: '',
			debugCmd: this.opts.enable
				? 'echo No debug command specified in cli-config'
				: `python manage.py runserver --noreload`,
			chartPath: `chart/${applicationName.toLowerCase()}`,
			applicationId: `${this.opts.application.app_id}`
		};

		if (this.fs.exists(this.destinationPath(FILENAME_CLI_CONFIG))) {
			logger.trace(FILENAME_CLI_CONFIG, "already exists, skipping.");
		} else {
			logger.trace( `Generating cli-config with cliConfig: ${JSON.stringify(cliConfig,null,3)}` )
			this._writeHandlebarsFile('../templates/cli-config-common.yml', FILENAME_CLI_CONFIG, { cliConfig });
		}

		if (this.fs.exists(this.destinationPath(FILENAME_DEV))) {
			logger.trace(FILENAME_DEV, "already exists, skipping.");
		} else {
			this._writeHandlebarsFile('python/run-dev', FILENAME_DEV, {
				port: port,
				enable: this.opts.enable,
				language: this.opts.application.language,
				name: this.opts.application.name.toLowerCase()
			});
		}
	}

	_generateGo() {
		const applicationName = this.opts.application.sanitizedName;
		const chartName = this.opts.application.sanitizedName;
		const port = this.opts.deploy_options.servicePorts.http;

		const cliConfig = {
			containerNameRun: `${applicationName.toLowerCase()}-go-run`,
			containerNameTools: `${applicationName.toLowerCase()}-go-tools`,
			hostPathRun: '.',
			hostPathTools: '.',
			// The colon adds a buffer command
			containerPathRun: `/go/src/goginapp; :`,
			containerPathTools: `/go/src/goginapp; :`,
			containerPortMap: `${port}:${port}`,
			containerPortMapDebug: '8181:8181',
			dockerFileRun: 'Dockerfile',
			dockerFileTools: 'Dockerfile-tools',
			imageNameRun: `${applicationName.toLowerCase()}-go-run`,
			imageNameTools: `${applicationName.toLowerCase()}-go-tools`,
			buildCmdRun: 'go build',
			testCmd: 'go test ./...',
			buildCmdDebug: 'go build',
			runCmd: '',
			stopCmd: '',
			debugCmd: 'dlv debug --headless --listen=0.0.0.0:8181',
			chartPath: `chart/${chartName}`,
			applicationId: `${this.opts.application.app_id}`
		};

		logger.trace( `Generating cli-config with cliConfig: ${JSON.stringify(cliConfig,null,3)}` )
		this._writeHandlebarsFile('../templates/cli-config-common.yml', FILENAME_CLI_CONFIG, { cliConfig });

	}

	_writeHandlebarsFile(templateFile, destinationFile, data) {

		if (this.fs.exists(this.destinationPath(destinationFile))) {
			logger.debug(destinationFile, "already exists, skipping.");
		}
		else {
			let template = this.fs.read(this.templatePath(templateFile));
			let compiledTemplate = Handlebars.compile(template);
			let output = compiledTemplate(data);
			this.fs.write(this.destinationPath(destinationFile), output);
		}
	}

	_copyTemplateIfNotExists(targetFileName, sourceTemplatePath, ctx) {
		if (this.fs.exists(this.destinationPath(targetFileName))) {
			logger.debug(targetFileName, "already exists, skipping.");
		} else {
			this.fs.copyTpl(
				this.templatePath(sourceTemplatePath),
				this.destinationPath(targetFileName),
				ctx
			);
		}

	}


};
