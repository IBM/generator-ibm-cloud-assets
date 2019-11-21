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

const Generator = require('yeoman-generator');
const _ = require('lodash');
const path = require('path');
const Utils = require('../lib/utils');

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

		this._sanitizeOption(this.options, DEPLOY_OPTIONS);
		this._sanitizeOption(this.options, APPLICATION_OPTIONS);
		console.log("THIS.OPTS: ")
		console.log(this.opts);

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

		console.log("end constructor")
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
		console.log("configuring")
		// process object for kube deployments
		if (this.bluemix.cloudDeploymentType == "kube") {
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

		console.log("end configuring")


	}

	writing() {
		console.log("writing")

		console.log("BLUEMIX: ")
		console.log(this.opts.bluemix);


		// runs subgenerators

		this.composeWith(require.resolve('../dockertools'), this.opts);

		if ( this.bluemix.cloudDeploymentType == "kube" ) {

			if ( this.bluemix.server.cloudDeploymentOptions.kubeDeploymentType == "KNATIVE" ) {
				console.log("write knative")
				this.composeWith(require.resolve('../knative'), this.opts);
			} else {
				console.log("write helm")
				this.composeWith(require.resolve('../kubernetes'), this.opts);
			}

		} else if (this.bluemix.cloudDeploymentType == "cloud_foundry") {
			console.log("write CF")
			this.composeWith(require.resolve('../cloud_foundry'), this.opts);
		}

		this.composeWith(require.resolve('../service'), this.opts);

		console.log("end writing")

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
		// console.log(options);
		const optionValue = options[name];
		console.log(`optionValue=${optionValue}`);
		if (optionValue && _.isFunction(optionValue.indexOf) && optionValue.indexOf('file:') === 0) {
			const fileName = optionValue.replace('file:', '');
			const filePath = this.destinationPath(`./${fileName}`);
			console.info(`Reading '${name}' parameter from local file ${filePath} with contents: ${this.fs.readJSON(filePath)}`);
			this.options[name] = this.fs.readJSON(filePath);
			console.log(`Saved this.options[${name}]=${this.options[name]}`);
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
		let bluemix = {
			name: application.name,
			cloudDeploymentType: Object.keys(deployOpts)[0],
			backendPlatform: application.language,
			services: application.services,
			server: {
				"cloudDeploymentOptions": {
					"kubeDeploymentType": (deployOpts.kube) ? deployOpts.kube.type : ""
				}
			}
		};

		if ( deployOpts.cloud_foundry ) {
			_.extend(bluemix.server, deployOpts.cloud_foundry);
			bluemix.server.host = bluemix.server.hostname;
			bluemix.cloudDeploymentType = "cloud_foundry";
		}

		return bluemix

	}
}
