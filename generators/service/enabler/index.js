/*
* © Copyright IBM Corp. 2019, 2020
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

const log4js = require('log4js');
const Generator = require('yeoman-generator');
const camelCase = require('lodash/camelCase');

const Utils = require('../../lib/utils');
const ServiceUtils = require('../../lib/service-utils');

const SvcInfo = require('../templates/serviceInfo.json');
const { logger } = require('handlebars');

const REGEX_HYPHEN = /-/g;

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		let serviceMappings = SvcInfo[opts.context.scaffolderKey] || {};
		this.scaffolderName = opts.context.scaffolderKey;
		this.serviceKey = serviceMappings["customServiceKey"] || this.scaffolderName;
		this.logger = log4js.getLogger("generator-ibm-cloud-assets:" + this.scaffolderName);
		this.context = opts.context;
		//this.config = {};
		this.cloudFoundryName = this.context.cloudLabel || serviceMappings["cfServiceName"] || this.scaffolderName;
		this.serviceName = serviceMappings["customServiceKey"] ? `service-${serviceMappings["customServiceKey"]}` : `service-${this.scaffolderName}`;
		this.logger.level = this.context.loggerLevel;
		this.languageTemplatePath = this.templatePath() + "/" + this.context.application.language;
		this.applicationType = (this.context.starter && this.context.starter.applicationType) ? this.context.starter.applicationType : "BLANK";
		this.logger.debug(`Constructing: scaffolderName=${this.scaffolderName}, serviceKey=${this.serviceKey}`);
	}

	initializing() {
		this._addJavaDependencies = Utils.addJavaDependencies.bind(this);
	}

	/**
	* The configuration context for services. This phase will execute the appropriate methods to add the mappings,
	*  and deployment configurtation for each service.
	*
	* @param config
	* @returns {undefined}
	*/
	configuring() {
		this.hasSvcProperty = Object.prototype.hasOwnProperty.call(this.context.application.service_credentials, this.scaffolderName);

		if (this.hasSvcProperty) {
			this.logger.info(`${this.scaffolderName} in ${this.context.application.language}; configuring credentials only`);
			this._addMappings(this.config);
			this._addLocalDevConfig();
		} else {
			this.logger.info(`Nothing to process for ${this.scaffolderName} in ${this.context.application.language}`);
			return;
		}
		let serviceInfo = this._getServiceInfo();

		this.logger.debug(`configuring - serviceInfo=${JSON.stringify(serviceInfo, null, 3)}`);

		if (serviceInfo && this.scaffolderName !== "autoscaling") {
			this._addMappings(this.config);
			this._addLocalDevConfig();
		}

		if (serviceInfo !== undefined) {
			this._createObjectForKubeYamls(serviceInfo);
		}
	}

	writing() {
		// add missing pom.xml dependencies when running service enablement standalone
		if ((typeof this.context.parentContext === "undefined") && this.hasSvcProperty) {
			this._addJavaDependencies();
		}
	}

	_sanitizeServiceName(name) {
		// Kubernetes env var names must match regex: '[A-Za-z_][A-Za-z0-9_]*'
		name = name.replace(REGEX_HYPHEN, '_');
		return name;
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
		let serviceInfo = {};
		if (this.context.application.service_credentials[this.scaffolderName]) {
			let service = this.context.application.service_credentials[this.scaffolderName];
			this.logger.debug(`included service: ${service}`);
			if (Object.prototype.hasOwnProperty.call(service, 'serviceInfo')) {
				serviceInfo = service.serviceInfo;
			} else if (Array.isArray(service)) {
				serviceInfo = service[0].serviceInfo;
			} else {
				serviceInfo = service.serviceInfo;
			}
		}
		return serviceInfo;
	}

	_createObjectForKubeYamls(serviceInfo) {
		this.logger.info(`adding Deployment service env info for ${this.scaffolderName} and service ${this.serviceName}`);

		let serviceEnv = {
			name: this._sanitizeServiceName(this.serviceName),
			valueFrom: {
				secretKeyRef: {
					name: `{{ .Values.services.${this.scaffolderName}.secretKeyRef}}`,
					key: 'binding'
				}
			},
			keyName: typeof (serviceInfo) === 'string' ? `${serviceInfo}` : `${serviceInfo.name}`,
			scaffolderName: `${this.scaffolderName}`
		};

		if (!this.context.deploymentServicesEnv) {
			this.context.deploymentServicesEnv = [];
		}

		this.context.deploymentServicesEnv.push(serviceEnv);
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

	_addMappings() {
		// This section basically sets a serviceInfo object
		// that is used when updating Kube ymls to
		// include service binding
		// It's dumb and has nothing to do with mappings.json,
		// but leaving it here due to legacy code.
		let serviceCredentials = Array.isArray(this.context.application.service_credentials[this.scaffolderName]) ? this.context.application.service_credentials[this.scaffolderName][0] : this.context.application.service_credentials[this.scaffolderName];
		if (Object.prototype.hasOwnProperty.call(this.context.application.service_credentials[this.scaffolderName], 'serviceInfo')) {
			serviceCredentials['serviceInfo'] = this.context.application.service_credentials[this.scaffolderName]['serviceInfo'];
		}
		else {
			let deployOpts;
			if (Object.prototype.hasOwnProperty.call(this.context.deploy_options, 'kube')) {
				deployOpts = this.context.deploy_options.kube;
			} else {
				deployOpts = this.context.deploy_options.cloud_foundry;
			}
			serviceCredentials['serviceInfo'] = deployOpts && Object.prototype.hasOwnProperty.call(deployOpts, 'service_bindings') ? deployOpts.service_bindings[this.scaffolderName] : {};
		}

		const mappings = this._generateMappingsJson(this.context, this.scaffolderName);

		this.context.addMappings(mappings);
	}

	// Create mappings.json file for consuming service credentials
	_generateMappingsJson(context, serviceId) {
		// always add a search path for app-name
		// it's a snowflake to make app name available for Node-RED app
		let mappings = {};
		mappings.application_name = {
			searchPatterns: [
				'cloudfoundry:$.application_name', // Cloud Foundry
				'env:K_SERVICE' // Code Engine
			]
		};

		const credentials = context?.application?.service_credentials;

		if (typeof credentials === "object" && Object.keys(credentials).length > 0) {
			const localDevConfigFilePath = ServiceUtils.localDevConfigFilepathMap[context.application.language];

			const cfLabel = context?.deploy_options?.cloud_foundry?.service_bindings?.[serviceId]?.label;
			const kubeSecret = context?.deploy_options?.kube?.service_bindings?.[serviceId];
			const cePrefix = context?.deploy_options?.code_engine?.service_bindings?.[serviceId];

			// loop over all keys in credential object
			for (const key in credentials[serviceId]) {
				// key is a credential key inside a credential object
				const mapKey = serviceId + '_' + key;
				mappings[mapKey] = {
					searchPatterns: []
				};

				// add CF search pattern if CF deployment
				if (cfLabel) {
					// example: "cloudfoundry:$['cloudantNoSQLDB'][0].credentials.url"
					mappings[mapKey].searchPatterns.push('cloudfoundry:$[\'' + cfLabel + '\'][0].credentials.' + key);
				}

				// add Kube search pattern if Kube deployment
				if (kubeSecret) {
					// example: "env:service_cloudant:$.apikey"
					mappings[mapKey].searchPatterns.push('env:service_' + serviceId + ':$.' + key);
				}

				// add Code Engine search pattern if Code Engine deployment
				if (cePrefix) {
					mappings[mapKey].searchPatterns.push('env:' + cePrefix + "_" + key.toUpperCase());
				}

				// always add file search pattern for local dev config
				// example: "file:/server/localdev-config.json:$.cloudant_apikey"
				mappings[mapKey].searchPatterns.push('file:/' + localDevConfigFilePath + ':$.' + serviceId + '_' + key);
			}

			return mappings;
		}
		else {
			this.logger.info("Application does not contain credentials, not creating mappings.json");

			return {};
		}
	}

	_addLocalDevConfig() {
		this.logger.info(`Adding local dev config for ${this.scaffolderName}`);
		let templateContent;
		let serviceCredentials = Array.isArray(this.context.application.service_credentials[this.scaffolderName]) ? this.context.application.service_credentials[this.scaffolderName][0] : this.context.application.service_credentials[this.scaffolderName];
		templateContent = this._setCredentialMapping({}, serviceCredentials, this.serviceKey);


		this.context.addLocalDevConfig(templateContent);
	}

	_setCredentialMapping(templateContent, serviceCredentials, currentKey) {
		let key, keys = Object.keys(serviceCredentials);
		for (let i = 0; i < keys.length; i++) {
			key = keys[i];
			let value = serviceCredentials[key];
			if (value !== null && value !== undefined && typeof (value) === 'object' && key !== 'serviceInfo') {
				// if value is object recursively repeat to inject complete object
				templateContent = this._setCredentialMapping(templateContent, value, `${this.serviceKey}_${key}`);
			}
			else if (value !== null && value !== undefined && value && key !== 'serviceInfo') {
				currentKey = currentKey.replace(/-/g, '_');
				templateContent[`${currentKey}_${key}`] = value;
			}
		}

		return templateContent;
	}
};
