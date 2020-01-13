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

'use strict';

const Log4js = require('log4js');
const logger = Log4js.getLogger('generator-ibm-cloud-assets:app');
const Generator = require('yeoman-generator');
const _ = require('lodash');
const path = require('path');
const Utils = require('../lib/utils');

const DEFAULT_LOG_LEVEL = "info";

const DEPLOY_OPTIONS = 'deploy_options';
const APPLICATION_OPTIONS = 'application';

const portDefault = {
	java: {
		http: '9080',
		https: '9443'
	},
	spring: {
		http: '8080'
	},
	node: {
		http: '3000'
	},
	python: {
		http: '3000'
	},
	swift: {
		http: '8080'
	},
	django: {
		http: '3000'
	},
	go: {
		http: '8080'
	}
}

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.opts = opts;
		this._setLoggerLevel();
		this.opts.loggerLevel = logger.level;

		if (this.opts.deployOptions) { this.opts.deploy_options = this.opts.deployOptions };
		this._sanitizeOption(this.options, DEPLOY_OPTIONS);
		this._sanitizeOption(this.options, APPLICATION_OPTIONS);
		this.log("THIS.OPTS: ");
		this.log(this.opts);

		if (this.options.libertyVersion === 'beta') {
			this.options.libertyBeta = true
		}

		this.opts.bluemix = this._makeBluemix(this.opts.deploy_options, this.opts.application);

		this.shouldPrompt = this.opts.bluemix ? false : true;

		/*
		Yeoman copies the opts when doing compose with to create own object reference
		that can be updated in prompting
		*/
		if (this.opts.bluemix) {
			this.bluemix = this.opts.bluemix;
		} else {
			this.bluemix = {};
			this.opts.bluemix = this.bluemix;
		}

		if (this.opts.bluemix.name && !this.opts.bluemix.sanitizedName) {
			this.opts.bluemix.sanitizedName = Utils.sanitizeAlphaNumDash(this.opts.bluemix.name);
		}

		// Find cloud deployment type to composeWith correct generators
		if (this.bluemix.server) {
			this.cloudDeploymentType = this.bluemix.server.cloudDeploymentType;
		} else {
			this.cloudDeploymentType = this.bluemix.cloudDeploymentType;
		}

	}

	_setLoggerLevel(){
		let level = (process.env.GENERATOR_LOG_LEVEL || DEFAULT_LOG_LEVEL).toUpperCase();
		logger.info("Setting log level to", level);
		/* istanbul ignore else */      //ignore for code coverage as the else block will set a known valid log level
		if(Log4js.levels.hasOwnProperty(level)) {
			logger.level = Log4js.levels[level];
		} else {
			logger.warn("Invalid log level specified (using default) : " + level);
			logger.level = DEFAULT_LOG_LEVEL.toUpperCase();
		}
	}

	intializing() {
	}

	prompting() {
		if (!this.shouldPrompt) {
			return;
		}
		const prompts = [];

		prompts.push({
			type: 'input',
			name: 'name',
			message: 'Project name',
			default: path.basename(process.cwd())
		});

		prompts.push({
			type: 'list',
			name: 'language',
			message: 'Language Runtime',
			choices: [
				'JAVA',
				'SPRING',
				'NODE',
				'PYTHON',
				'SWIFT',
				'DJANGO',
				'GO'
			]
		});

		prompts.push({
			type: 'input',
			name: 'deploymentType',
			message: 'Deployment Type (kube, cloud_foundry)',
			default: path.basename(process.cwd())
		});

		prompts.push({
			type: 'list',
			name: 'kubeDeploymentType',
			message: 'Kube Deployment Type',
			choices: [
				'HELM',
				'KNATIVE'
			]
		});
		return this.prompt(prompts).then(this._processAnswers.bind(this));

	}

	configuring() {

		this.opts.application.sanitizedName = Utils.sanitizeAlphaNumLowerCase(this.opts.application.name);

		// process object for kube deployments
		if (this.opts.deploy_options && this.bluemix.cloudDeploymentType == "kube") {
			// work out app name and language
			this.opts.bluemix.language = _.toLower(this.bluemix.backendPlatform);
			if(this.opts.bluemix.language === 'java' || this.opts.bluemix.language === 'spring') {
				this.opts.bluemix.applicationName = this.opts.bluemix.appName || Utils.sanitizeAlphaNum(this.bluemix.name);
			} else {
				this.opts.bluemix.applicationName = Utils.sanitizeAlphaNum(this.bluemix.name);
			}

			this.opts.bluemix.chartName = Utils.sanitizeAlphaNumLowerCase(this.opts.bluemix.applicationName);

			this.opts.bluemix.services = typeof(this.opts.bluemix.services) === 'string' ? JSON.parse(this.opts.bluemix.services || '[]') : this.opts.bluemix.services;

			this.opts.bluemix.servicePorts = {};
			//use port if passed in
			if(this.opts.bluemix.port) {
				this.opts.bluemix.servicePorts.http = this.opts.bluemix.port;
			} else {
				this.opts.bluemix.servicePorts.http = portDefault[this.opts.bluemix.language].http;
				if(portDefault[this.opts.bluemix.language].https) {
					this.opts.bluemix.servicePorts.https = portDefault[this.opts.bluemix.language].https;
				}
			}

			if (this.bluemix.server && this.bluemix.server.cloudDeploymentOptions && this.bluemix.server.cloudDeploymentOptions.kubeDeploymentType) {
					this.opts.bluemix.kubeDeploymentType = this.bluemix.server.cloudDeploymentOptions.kubeDeploymentType;
			}

		}
	}

	writing() {
		// runs subgenerators

		this.composeWith(require.resolve('../cli_tools'), this.opts);

		if (this.opts.deploy_options) {
			if ( this.bluemix.cloudDeploymentType == "kube" ) {

				if ( this.bluemix.server.cloudDeploymentOptions.kubeDeploymentType == "KNATIVE" ) {
					this.log("write knative")
					this.composeWith(require.resolve('../knative'), this.opts);
				} else {
					this.log("write helm")
					this.composeWith(require.resolve('../kubernetes'), this.opts);
				}

			} else if (this.bluemix.cloudDeploymentType == "cloud_foundry") {
				this.log("write CF")
				this.composeWith(require.resolve('../cloud_foundry'), this.opts);
			}
		}

		this.composeWith(require.resolve('../service'), this.opts);

		this.log("end writing")

	}

	_processAnswers(answers) {
		// processes answers from the prompts, not part of production flow
		_.extend(this.bluemix,
			{
				server: {
					cloudDeploymentType: answers.deploymentType,
					cloudDeploymentOptions:  { kubeDeploymentType: answers.kubeDeploymentType }
				},
				cloudDeploymentType: answers.deploymentType,
				sanitizedName: Utils.sanitizeAlphaNumDash(answers.name),
				name: answers.name,
				backendPlatform: answers.language
			}
		);
	}

	_sanitizeOption(options, name) {
		// this.log(options);
		const optionValue = options[name];
		this.log(`optionValue=${optionValue}`);
		if (optionValue && _.isFunction(optionValue.indexOf) && optionValue.indexOf('file:') === 0) {
			const fileName = optionValue.replace('file:', '');
			const filePath = this.destinationPath(`./${fileName}`);
			console.info(`Reading '${name}' parameter from local file ${filePath} with contents: ${this.fs.readJSON(filePath)}`);
			this.options[name] = this.fs.readJSON(filePath);
			this.log(`Saved this.options[${name}]=${this.options[name]}`);
			return this.options[name];
		}

		try {
			this.options[name] = typeof (this.options[name]) === 'string' ?
				JSON.parse(this.options[name]) : this.options[name];
		} catch (e) {
			throw Error(`${name} parameter is expected to be a valid stringified JSON object: ${e}`);
		}
	}

	_makeBluemix(deployOpts, application){

		const hasServiceCreds = application.hasOwnProperty("service_credentials");
		let bluemix = {
			name: application.name,
			applicationName: application.name,
			cloudDeploymentType: (deployOpts) ? Object.keys(deployOpts)[0] : false,
			backendPlatform: application.language,
			server: {
				services: hasServiceCreds ? Object.keys(application.service_credentials) : {},
				cloudDeploymentType: (deployOpts) ? Object.keys(deployOpts)[0] : false,
				"cloudDeploymentOptions": {
					"kubeDeploymentType": (deployOpts && deployOpts.kube) ? deployOpts.kube.type : false
				}
			}
		};

		if ( deployOpts && deployOpts.cloud_foundry ) {
			_.extend(bluemix.server, deployOpts.cloud_foundry);
			bluemix.server.host = bluemix.server.hostname;
			bluemix.cloudDeploymentType = "cloud_foundry";
		}
		
		if (hasServiceCreds) {
			let bindings = (deployOpts) ? deployOpts[bluemix.cloudDeploymentType]["service_bindings"] : {};
			for (let service of Object.keys(application.service_credentials)) {
				let obj = {}
				obj[service] = [application.service_credentials[service]];
				let binding = ( bindings ) ? bindings[service] : "REPLACEME-binding-" + service;
				if (bluemix.cloudDeploymentType === "cloud_foundry") {
					obj[service]["serviceInfo"] = {
						"name": binding.name,
						"cloudLabel": binding.label,
					}
				} else {
					obj[service]["serviceInfo"] = {
						"name": binding,
						"cloudLabel": service,
					}
				}
				_.extend(bluemix, obj);
			}

		}

		return bluemix;
	}
}
