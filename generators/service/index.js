/*
 * © Copyright IBM Corp. 2019
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const Log4js = require('log4js');
const logger = Log4js.getLogger('generator-ibm-cloud-assets:service');
const Generator = require('yeoman-generator');
const fs = require('fs');
const camelCase = require('lodash/camelCase');
const path = require('path');
const yaml = require('js-yaml');

const Handlebars = require('../lib/handlebars');
const ServiceUtils = require('../lib/service-utils');
const Utils = require('../lib/utils');

const Bundle = require("./../../package.json");
const scaffolderMapping = require('./templates/scaffolderMapping.json');

const REGEX_HYPHEN = /-/g;
const REGEX_LEADING_ALPHA = /^[^a-zA-Z]*/;
const REGEX_ALPHA_NUM = /[^a-zA-Z0-9]/g;

const OPTION_BLUEMIX = "bluemix";
const OPTION_STARTER = "starter";

const PATH_GIT_IGNORE = "./.gitignore";

const config = {
	cloudFoundryIsArray: true,
	mappingVersion: 1
};

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.opts = opts;
		logger.debug("Constructing");
		if (opts.quiet) {
			logger.level = Log4js.levels.OFF;
		} else {
			logger.info("Package info ::", Bundle.name, Bundle.version);
			logger.level = opts.loggerLevel;
		}
		this.parentContext = opts.parentContext;

		// this.log("Service opts.bluemix:");
		// this.log(opts.bluemix);
		// this.log(Object.keys(opts.bluemix));
		let context = this.parentContext || {};
		//add bluemix options from this.options to existing bluemix options on parent context
		// context.bluemix = {};
		// context.bluemix = Object.assign(context.bluemix, opts.bluemix);
		context.deploy_options = {};
		context.deploy_options = Object.assign(context.deploy_options, opts.deploy_options);
		logger.debug(`Constructing - context.deploy_options: ${JSON.stringify(context.deploy_options, null, 3)}`);
		context.application = {};
		context.application = Object.assign(context.application, opts.application);
		logger.debug(`Constructing - context.application: ${JSON.stringify(context.application, null, 3)}`);

		context.starter = opts.starter || {}; //Object.assign(context.starter || {}, this.opts.starter || {});
		context.loggerLevel = logger.level;
		// this.log('Service context.bluemix: %bmx', {bmx: context.bluemix});
		// this.log(Object.keys(context.bluemix));
		// this.log(Object.prototype.toString.call(context.bluemix));
		// context.language = context.bluemix.backendPlatform.toLowerCase();

		// if (context.language === 'django'){
		// 	context.language = 'python';
		// }
		context.sanitizedAppName = this._sanitizeAppName(context.application.name);

		if (this.parentContext) {	// set a parent context to let the language generator know if there is a parent
			context.parentContext = this.parentContext;
		}
		this.context = context;
	}

	intializing() {
		let context = this.context;
		let languageGeneratorPath = "./languages";
		switch (context.application.language.toLowerCase()) {
			case "node":
				languageGeneratorPath += '/node-express';
				break;
			case "python":
			case "django":
				languageGeneratorPath += '/python-flask';
				break;
			case "java":
				languageGeneratorPath += '/java';
				// context.application.language = 'java-liberty';
				break;
			case "spring":
				languageGeneratorPath += '/java';
				// context.application.language = 'java-spring';
				break;
			case "swift":
				languageGeneratorPath += '/swift-kitura';
				// context.application.language = 'swift';
				break;
			case "go":
				languageGeneratorPath += '/go'
				break;
		}

		if (this.parentContext) {	// set a parent context to let the language generator know if there is a parent
			context.parentContext = this.parentContext;
		}

		logger.info("Composing with", languageGeneratorPath);
		this.composeWith(require.resolve(languageGeneratorPath), {context: context});
	}

	/**
	 * The configuration context for service generators. This phase will execute the appropriate methods to add the mappings,
	 * implementation code, and deployment configurtation for each service. There are few exceptions to note:
	 *
	 *	Only add mapping file and local-dev config file if the service is not autoscaling or the service does not have an SDK
	 *  Only add appid code snippets for node apps when it's a web app
	 *
	 *
	 * @param config
	 * @returns {undefined}
	 */
	configuring() {
	}

	writing() {
	}

	_sanitizeOption(options, name) {
		let optionValue = options[name];
		if (!optionValue) {
			logger.info("Did not receive", name, "parameter from Scaffolder. Falling back to fallback_" + name + ".js");
			this.options[name] = JSON.parse(require("./fallback_" + name));
			return
		}

		if (optionValue.indexOf("file:") === 0){
			let fileName = optionValue.replace("file:","");
			let filePath = this.destinationPath("./" + fileName);
			logger.info("Reading", name, "parameter from local file", filePath);
			this.options[name] = this.fs.readJSON(filePath);
			return;
		}

		try {
			this.options[name] = typeof(this.options[name]) === "string" ?
				JSON.parse(this.options[name]) : this.options[name];
		} catch (e) {
			logger.error(e);
			throw name + " parameter is expected to be a valid stringified JSON object";
		}
	}

	_sanitizeServiceName(name) {
		// Kubernetes env var names must match regex: '[A-Za-z_][A-Za-z0-9_]*'
		name = name.replace(REGEX_HYPHEN, '_');
		return name;
	}

	_sanitizeAppName(name) {
		let cleanName = "";
		if (name !== undefined) {
			cleanName = name.replace(REGEX_LEADING_ALPHA, '').replace(REGEX_ALPHA_NUM, '');
		}
		return (cleanName || 'APP').toLowerCase();
	}

	_sanitizeJSONString(dirtyJSONString) {
		const lastIndexOfComma = dirtyJSONString.lastIndexOf(',');
		const prunedJSONString = dirtyJSONString.split("").filter((value, idx) => {
			if (idx !== lastIndexOfComma) { return value; }
		}).join("");
		const invalidEndComma = '}';
		return dirtyJSONString[lastIndexOfComma - 1] === invalidEndComma && dirtyJSONString[dirtyJSONString.length - 2] === invalidEndComma ? prunedJSONString : dirtyJSONString;
	}

	end() {
		// add services secretKeyRefs to deployment.yaml &&
		// add services secretKeyRefs to values.yaml &&
		// add secretKeyRefs to service.yaml
		return ServiceUtils.addServicesEnvToHelmChartAsync({context: this.context, destinationPath: this.destinationPath()})
			.then(() => ServiceUtils.addServicesEnvToValuesAsync({context: this.context, destinationPath: this.destinationPath()}))
			.then(() => ServiceUtils.addServicesToServiceKnativeYamlAsync({context: this.context, destinationPath: this.destinationPath(Utils.PATH_KNATIVE_YAML)}));
			// .then(() => logger.info(`service:end - service.yaml: ${JSON.stringify(yaml.safeLoad(fs.readFileSync(this.destinationPath(Utils.PATH_KNATIVE_YAML))), null, 2)}`));
	}

};
