/*
 * © Copyright IBM Corp. 2017, 2018
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
const Bundle = require("./../../package.json");
const fs = require('fs');
const camelCase = require('lodash/camelCase');
const path = require('path');

const Handlebars = require('../lib/handlebars');
const ServiceUtils = require('../lib/service-utils');
const Utils = require('../lib/utils');
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

		this.log("Service opts.bluemix:");
		this.log(opts.bluemix);
		this.log(Object.keys(opts.bluemix));
		let context = this.parentContext || {};
		//add bluemix options from this.options to existing bluemix options on parent context
		context.bluemix = {};
		context.bluemix = Object.assign(context.bluemix, opts.bluemix);
		context.starter = opts.starter || {}; //Object.assign(context.starter || {}, this.opts.starter || {});
		context.loggerLevel = logger.level;
		this.log('Service context.bluemix: %bmx', {bmx: context.bluemix});
		this.log(Object.keys(context.bluemix));
		this.log(Object.prototype.toString.call(context.bluemix));
		context.language = context.bluemix.backendPlatform.toLowerCase();

		if (context.language === 'django'){
			context.language = 'python';
		}
		context.sanitizedAppName = this._sanitizeAppName(context.bluemix.name);

		if (this.parentContext) {	// set a parent context to let the language generator know if there is a parent
			context.parentContext = this.parentContext;
		}
		this.context = context;
	}

	intializing() {
		let context = this.context;
		let languageGeneratorPath = "./languages";
		switch (context.language){
			case "node":
				languageGeneratorPath += '/node-express';
				break;
			case "python":
				languageGeneratorPath += '/python-flask';
				break;
			case "java":
				languageGeneratorPath += '/java';
				context.language = 'java-liberty';
				break;
			case "spring":
				languageGeneratorPath += '/java';
				context.language = 'java-spring';
				break;
			case "swift":
				languageGeneratorPath += '/swift-kitura';
				context.language = 'swift';
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
		// this.context.addServices = false;
		// this.context.service_imports = [];
		// this.context.service_variables = [];
		// this.context.service_initializers = [];
		// this.context.dependencies = [];
		// this.context.addDependencies = this._addDependencies.bind(this);
		// this.context.addMappings = this._addMappings.bind(this);
		// this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);

		// this.hasBluemixProperty = this.context.bluemix.hasOwnProperty(this.scaffolderName);
		// this.hasTemplate = fs.existsSync(this.languageTemplatePath);
		// if (this.hasBluemixProperty && !this.hasTemplate) {
		// 	logger.info(`No available sdk available for ${this.scaffolderName} in ${this.context.language}; configuring credentials only`);
		// 	this._addMappings(config);
		// 	this._addLocalDevConfig();
		// 	return;
		// }

		// let serviceInfo = this._getServiceInfo();

		// if (serviceInfo && this.scaffolderName !== "autoscaling") {
		// 	this._addMappings(config);
		// 	this._addLocalDevConfig();
		// }

		// if (serviceInfo && this.scaffolderName === "appid" && this.context.language === "node") {
		// 	this._handleAppidForNode();
		// }
		// else {
		// 	this._addDependencies();
		// }

		// if (serviceInfo !== undefined) {
		// 	this._addServicesToKubeDeploy(serviceInfo);
		// 	this._addServicesToPipeline(serviceInfo);
		// }
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

	_handleAppidForNode() {
		// AppID dependencies / html are only
		// intended for web apps, they do not apply to MS or blank projects
		if (this.applicationType.toLowerCase() === "web") {
			this._addDependencies();
			this._addHtml();
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

	_getServiceInfo() {
		this.log("this.scaffolderName")
		this.log(this.scaffolderName)
		let serviceInfo = {};
		if (this.context.bluemix[this.scaffolderName]) {
			let service = this.context.bluemix[this.scaffolderName];
			if (Array.isArray(service)) {
				serviceInfo = service[0].serviceInfo;
			} else {
				serviceInfo = service.serviceInfo;
			}
		}
		return serviceInfo;
	}

	_addServicesToPipeline(serviceInfo) {
		if (!this.context.servicesInfo) {
			this.context.servicesInfo = [];
		}
		this.context.servicesInfo.push(serviceInfo);
	}

	_addServicesToKubeDeploy(serviceInfo) {
		logger.info(`adding Deployment service env info for ${this.scaffolderName}`);

		let serviceEnv = {
			name: this._sanitizeServiceName(this.serviceName),
			valueFrom: {
				secretKeyRef: {
					name: `{{ .Values.services.${this.scaffolderName}.secretKeyRef}}`,
					key: 'binding'
				}
			},
			keyName: `${serviceInfo.name}`,
			scaffolderName: `${this.scaffolderName}`
		};

		if (!this.context.deploymentServicesEnv) {
			this.context.deploymentServicesEnv = [];
		}

		this.context.deploymentServicesEnv.push(serviceEnv);
	}

	_addDependencies() {
		logger.info("Adding dependencies");
		if (Array.isArray(this.context.dependenciesFile)) {
			for (let i = 0; i < this.context.dependenciesFile.length; i++) {
				this.context.addDependencies(this.fs.read(this.languageTemplatePath + "/" + this.context.dependenciesFile[i]));
			}
		} else {
			let dependenciesString = this.fs.read(this.languageTemplatePath + "/" + this.context.dependenciesFile);
			if (this.context.dependenciesFile.endsWith('.template')) {			//pass through handlebars if this is a .template file
				let template = Handlebars.compile(dependenciesString);
				dependenciesString = template(this.context);
			}
			this.context.addDependencies(dependenciesString);
		}
	}

	_mapCredentialKeysToScaffolderKeys(credentialKeys, scaffolderKeys) {
		let map = {};
		for (let i = 0; i < credentialKeys.length; i++) {
			let key = credentialKeys[i];
			let scaffolderKey = scaffolderKeys.find(value => {
				let cleanScaffolderKey = camelCase(value).toLowerCase().replace(/ /g, '');
				let cleanCredKey = camelCase(key).toLowerCase().replace(/ /g, '');
				return cleanScaffolderKey.length >= cleanCredKey.length && cleanScaffolderKey.startsWith(cleanCredKey);
			});

			if (!map[key]) {
				map[key] = scaffolderKey;
			}
		}

		return map;
	}

	_addMappings(config) {
		if (this.context.language === "swift") return;
		logger.info("Adding mappings");

		let serviceCredentials = Array.isArray(this.context.bluemix[this.scaffolderName])
			? this.context.bluemix[this.scaffolderName][0] : this.context.bluemix[this.scaffolderName];
		if (!serviceCredentials) {
			serviceCredentials = {};
		}
		let scaffolderKeys = this._setCredentialMapping({}, serviceCredentials, this.serviceKey);
		this.log("scaffolderKeys: " + JSON.stringify(scaffolderKeys, null, 3))
		scaffolderKeys = Object.keys(scaffolderKeys).map(key => {
			let scaffolderKey = key.split(`${this.serviceKey.replace(/-/g, '_')}_`);
			if (Array.isArray(scaffolderKey) && scaffolderKey.length > 1) {
				return scaffolderKey[1];
			}
		});

		let version = config.mappingVersion ? config.mappingVersion : 1;
		let credentialKeys = this.customCredKeys.length > 0 ? this.customCredKeys : scaffolderKeys.filter(key => { return key !== 'serviceInfo' });
		let credKeysToScaffolderKeysMap = {};

		scaffolderKeys.sort();
		credentialKeys.sort();
		this.log("credential keys: " + credentialKeys)

		credKeysToScaffolderKeysMap = this._mapCredentialKeysToScaffolderKeys(credentialKeys, scaffolderKeys);

		let mapping = fs.readFileSync(path.join(__dirname, '..', 'resources', `mappings.v${version}.json.template`), 'utf-8');

		Handlebars.registerHelper('access', (map, key, nestedJSON) => {
			return nestedJSON ? map[key].replace('_', '.') : map[key];
		});

		let template = Handlebars.compile(mapping);
		let localServiceKey = this.serviceKey;
		let serviceKeySeparator = '_';
		let localCredentialKeys = [];
		let springMapping = null;
		if (this.context.language === "java-spring") {
			springMapping = ServiceUtils.getSpringServiceInfo(this.serviceKey)
			if (springMapping) {
				if (ServiceUtils.SPRING_BOOT_SERVICE_NAME in springMapping) {
					localServiceKey = springMapping[ServiceUtils.SPRING_BOOT_SERVICE_NAME]
				}
				if (ServiceUtils.SPRING_BOOT_SERVICE_KEY_SEPARATOR in springMapping) {
					serviceKeySeparator = springMapping[ServiceUtils.SPRING_BOOT_SERVICE_KEY_SEPARATOR]
				}
				this.log("Spring service cred map found for " + this.serviceKey + springMapping ? JSON.stringify(springMapping, null, 3) : springMapping)
			}
		}

		for (let i = 0; i < credentialKeys.length; i++) {
			localCredentialKeys[i] = []
			localCredentialKeys[i][0] = credentialKeys[i]
			if (springMapping) {
				let mappedKey = credentialKeys[i]
				if (credentialKeys[i] in springMapping) {
					localCredentialKeys[i][1] = springMapping[credentialKeys[i]]
				}
				else {
					localCredentialKeys[i][1] = credentialKeys[i]
				}
				localCredentialKeys.push(mappedKey ? mappedKey : credentialKeys[i]);
			}
			else {
				localCredentialKeys[i][1] = credentialKeys[i]
			}
		}
		this.log("localServiceKey: " + localServiceKey)
		this.log("localCredentialKeys: " + localCredentialKeys)

		let context = {
			credentialKeys: localCredentialKeys,
			map: credKeysToScaffolderKeysMap,
			generatorLocation: this.context.generatorLocation,
			cloudFoundryIsArray: config.cloudFoundryIsArray,
			nestedJSON: config.nestedJSON
		};

		let generatedMappingString = this._sanitizeJSONString(template(context));
		let mappings = JSON.parse(generatedMappingString);

		this.context.addMappings(mappings);
	}

	_addLocalDevConfig() {
		logger.info("Adding local dev config");
		let templateContent;
		let serviceCredentials = Array.isArray(this.context.bluemix[this.scaffolderName])
			? this.context.bluemix[this.scaffolderName][0] : this.context.bluemix[this.scaffolderName];
		templateContent = this._setCredentialMapping({}, serviceCredentials, this.serviceKey);

		this.context.addLocalDevConfig(templateContent);
	}

	/*_addHtml() {
		logger.info("Adding AppID login html snippet to landing page");

		this.fs.copy(
			this.languageTemplatePath + "/appid.html",
			this.destinationPath("./public/appid.html")
		);
	}*/

	_setCredentialMapping(templateContent, serviceCredentials, currentKey) {
		let key,
			keys = Object.keys(serviceCredentials);
		for (let i = 0; i < keys.length; i++) {
			key = keys[i];
			if (typeof (serviceCredentials[key]) === 'object' && key !== 'serviceInfo') {
				templateContent = this._setCredentialMapping(templateContent, serviceCredentials[key], `${this.serviceKey}_${key}`);
				continue;
			}

			if (key !== 'serviceInfo') {
				currentKey = currentKey.replace(/-/g, '_');
				templateContent[`${currentKey}_${key}`] = serviceCredentials[key];
			}
		}

		return templateContent;
	}

	end() {
		// add services secretKeyRefs to deployment.yaml &&
		// add services secretKeyRefs to values.yaml &&
		// add secretKeyRefs to service.yaml
		console.log("service context")
		console.log(this.context);
		return ServiceUtils.addServicesEnvToHelmChartAsync({context: this.context, destinationPath: this.destinationPath()})
			.then(() => ServiceUtils.addServicesEnvToValuesAsync({context: this.context, destinationPath: this.destinationPath()}))
			.then(() => ServiceUtils.addServicesToServiceKnativeYamlAsync({context: this.context, destinationPath: this.destinationPath(Utils.PATH_KNATIVE_YAML)}));
	}

};
