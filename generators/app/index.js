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
const logger = Log4js.getLogger('generator-ibm-cloud-assets:app');
const Generator = require('yeoman-generator');
const _ = require('lodash');
const path = require('path');
const Utils = require('../lib/utils');

const DEFAULT_LOG_LEVEL = "info";

const DEPLOY_OPTIONS = 'deploy_options';
const APPLICATION_OPTIONS = 'application';

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.opts = opts;
		this._setLoggerLevel();
		this.opts.loggerLevel = logger.level;

		if (this.opts.deployOptions) { this.opts.deploy_options = this.opts.deployOptions }
		this._sanitizeOption(this.options, DEPLOY_OPTIONS);
		this._sanitizeOption(this.options, APPLICATION_OPTIONS);
		logger.debug("THIS.OPTS: " + JSON.stringify(this.opts, null, 3));

		if (this.options.libertyVersion === 'beta') {
			this.options.libertyBeta = true
		}

		this.shouldPrompt = this.opts.application ? false : true;
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

	/**
	 * Executed when user runs generator via yo CLI, not in production.
	 */
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
			],
			default: "NODE"
		});

		prompts.push({
			type: 'list',
			name: 'deploymentType',
			message: 'Deployment Type (kube, cloud_foundry)',
			choices: [
				'kube',
				'cloud_foundry'
			],
			default: "kube"
		});

		prompts.push({
			type: 'list',
			name: 'kubeDeploymentType',
			message: 'Kube Deployment Type',
			choices: [
				'KNATIVE',
				'HELM'
			],
			default: "KNATIVE"
		});

		prompts.push({
			type: 'input',
			name: 'cluster_name',
			message: 'Cluster name if KUBE',
			default: "mycluster"
		});

		prompts.push({
			type: 'input',
			name: 'region',
			message: 'Cluster region if KUBE',
			default: "ibm:ys1:us-south"
		});

		return this.prompt(prompts).then(this._processAnswers.bind(this));
	}

	configuring() {
		this.opts.application.sanitizedName = Utils.sanitizeAlphaNumLowerCase(this.opts.application.name);
		this.opts.application.chartName = Utils.sanitizeAlphaNumLowerCase( this.opts.application.name );
		this.opts.deploy_options.servicePorts = Utils.portDefault[this.opts.application.language.toLowerCase()]
	}

	writing() {
		// runs subgenerators
		this.composeWith(require.resolve('../cli_tools'), this.opts);

		if (this.opts.deploy_options) {
			if ( this.opts.deploy_options.kube ) {
				if ( this.opts.deploy_options.kube.type == "KNATIVE" ) {
					logger.debug("write knative")
					this.composeWith(require.resolve('../knative'), this.opts);
				} else {
					logger.debug("write helm")
					this.composeWith(require.resolve('../kubernetes'), this.opts);
				}

			} else if (this.opts.deploy_options.cloud_foundry) {
				logger.debug("write CF")
				this.composeWith(require.resolve('../cloud_foundry'), this.opts);
			}
		}
		logger.debug("write services")
		this.composeWith(require.resolve('../service'), this.opts);

		logger.debug("end writing")
	}

	_processAnswers(answers) {
		// processes answers from the prompts, not part of production flow

		if ( answers.deploymentType == "cloud_foundry" ) {
			//CF
			this.opts.deploy_options = {
				"cloud_foundry": {
					"disk_quota": "1G",
					"domain": "mydomain.com",
					"hostname": "my-app-hostname",
					"instances": 3,
					"memory": "512MB",
					"service_bindings": {}
			    }
			}
		} else {
			//KUBE
			this.opts.deploy_options = {
				"kube": {
					"cluster_name": answers.cluster_name,
					"region": answers.region,
					"type": answers.kubeDeploymentType,
					"service_bindings": {}
				}
			}
		} 

		this.opts.application = {
			"app_id": "4b395cc4-5149-48e2-b711-b3dd80cf3f11",
			"name": answers.name,
			"language": answers.language,
			"service_credentials": {}
		}

	}

	_sanitizeOption(options, name) {
		// logger.debug(options);
		const optionValue = options[name];
		logger.debug(`optionValue=${optionValue}`);
		if (optionValue && _.isFunction(optionValue.indexOf) && optionValue.indexOf('file:') === 0) {
			// reading options from file, not part of production execution
			const fileName = optionValue.replace('file:', '');
			const filePath = this.destinationPath(`./${fileName}`);
			console.info(`Reading '${name}' parameter from local file ${filePath} with contents: ${this.fs.readJSON(filePath)}`);
			this.options[name] = this.fs.readJSON(filePath);
			logger.debug(`Saved this.options[${name}]=${this.options[name]}`);
			return this.options[name];
		}

		try {
			this.options[name] = typeof (this.options[name]) === 'string' ?
				JSON.parse(this.options[name]) : this.options[name];
		} catch (e) {
			throw Error(`${name} parameter is expected to be a valid stringified JSON object: ${e}`);
		}
	}
}
