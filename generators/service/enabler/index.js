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
const fs = require('fs');
const camelCase = require('lodash/camelCase');
const path = require('path');
const Handlebars = require('handlebars');

const Utils = require('../../lib/utils');
const ServiceUtils = require('../../lib/service-utils');

const SvcInfo = require('../templates/serviceInfo.json');

const REGEX_HYPHEN = /-/g;

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		let serviceMappings = SvcInfo[opts.context.scaffolderKey] || {};
		this.scaffolderName = opts.context.scaffolderKey;
		this.serviceKey = serviceMappings["customServiceKey"] || this.scaffolderName;
		this.logger = log4js.getLogger("generator-ibm-cloud-assets:" + this.scaffolderName);
		this.context = opts.context;
		this.config = {};
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
		if (this.context.application.language === "swift") return;
		this.logger.info(`Adding mappings for ${this.scaffolderName}`);

		let serviceCredentials = Array.isArray(this.context.application.service_credentials[this.scaffolderName])
			? this.context.application.service_credentials[this.scaffolderName][0] : this.context.application.service_credentials[this.scaffolderName];
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
		this.logger.debug(`_addMappings - serviceCredentials=${JSON.stringify(serviceCredentials, null, 3)}`);
		this.logger.debug(`_addMappings - deploy_options=${JSON.stringify(this.context.deploy_options, null, 3)}`);
		let scaffolderKeys = this._setCredentialMapping({}, serviceCredentials, this.serviceKey);
		scaffolderKeys = Object.keys(scaffolderKeys).map(key => {
			let scaffolderKey = key.split(`${this.serviceKey.replace(/-/g, '_')}_`);
			if (Array.isArray(scaffolderKey) && scaffolderKey.length > 1) {
				return scaffolderKey[1];
			}
		});

		let version = 1;
		let credentialKeys = scaffolderKeys.filter(key => { return key !== 'serviceInfo' });
		let credKeysToScaffolderKeysMap = {};

		scaffolderKeys.sort();
		credentialKeys.sort();

		credKeysToScaffolderKeysMap = this._mapCredentialKeysToScaffolderKeys(credentialKeys, scaffolderKeys);


		let mapping = fs.readFileSync(path.join(__dirname, '../templates', `mappings.v${version}.json.template`), 'utf-8');

		Handlebars.registerHelper('access', (map, key, nestedJSON) => {
			return nestedJSON ? map[key].replace('_', '.') : map[key];

		});

		let template = Handlebars.compile(mapping);
		let localServiceKey = this.serviceKey;
		let serviceKeySeparator = '_'
		let localCredentialKeys = [];
		let springMapping = null
		if (this.context.application.language === "SPRING") {
			springMapping = ServiceUtils.getSpringServiceInfo(this.serviceKey)
			if (springMapping) {
				if (ServiceUtils.SPRING_BOOT_SERVICE_NAME in springMapping) {
					localServiceKey = springMapping[ServiceUtils.SPRING_BOOT_SERVICE_NAME]
				}
				if (ServiceUtils.SPRING_BOOT_SERVICE_KEY_SEPARATOR in springMapping) {
					serviceKeySeparator = springMapping[ServiceUtils.SPRING_BOOT_SERVICE_KEY_SEPARATOR]
				}
				console.log("Spring service cred map found for " + this.serviceKey + springMapping ? JSON.stringify(springMapping, null, 3) : springMapping)
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

		let context = {
			serviceName: serviceCredentials.serviceInfo.name,
			serviceKey: this.serviceKey.replace(/-/g, '_'),
			localServiceKey: localServiceKey.replace(/-/g, '_'),
			serviceKeySeparator: serviceKeySeparator,
			credentialKeys: localCredentialKeys,
			map: credKeysToScaffolderKeysMap,
			cloudFoundryKey: this.cloudFoundryName,
			cloudFoundryIsArray: true,
			localDevConfigFP: ServiceUtils.localDevConfigFilepathMap[this.options.context.application.language]
		};

		let generatedMappingString = this._sanitizeJSONString(template(context));
		let mappings = JSON.parse(generatedMappingString);

		this.context.addMappings(mappings);
	}


	_addLocalDevConfig() {
		this.logger.info(`Adding local dev config for ${this.scaffolderName}`);
		let templateContent;
		let serviceCredentials = Array.isArray(this.context.application.service_credentials[this.scaffolderName])
			? this.context.application.service_credentials[this.scaffolderName][0] : this.context.application.service_credentials[this.scaffolderName];
		templateContent = this._setCredentialMapping({}, serviceCredentials, this.serviceKey);


		this.context.addLocalDevConfig(templateContent);
	}

	_setCredentialMapping(templateContent, serviceCredentials, currentKey) {
		let key,
			keys = Object.keys(serviceCredentials);
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
