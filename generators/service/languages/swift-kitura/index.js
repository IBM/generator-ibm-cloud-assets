'use strict';
const logger = require('log4js').getLogger("generator-cloud-assets:languages-swift-kitura");
const Generator = require('yeoman-generator');
const path = require('path');
const ServiceUtils = require('../../../lib/service-utils');


const scaffolderMapping = require('../../templates/scaffolderMapping.json');
const svcInfo = require('../../templates/serviceInfo.json');

// Load mappings between bluemix/scaffolder labels and the labels generated in the localdev-config.json files
const bluemixLabelMappings = require('./bluemix-label-mappings.json');

const PATH_MAPPINGS_FILE = "./config/mappings.json";
const PATH_LOCALDEV_CONFIG_FILE = "./config/localdev-config.json";
const FILE_SEARCH_PATH_PREFIX = "file:/config/localdev-config.json:";

module.exports = class extends Generator {
	// Expecting:
	// opts.context Object
	// opts.context.bluemix Object
	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.debug('Constructing');
	}

	initializing() {
		this.context.languageFileExt = ".swift";
		this.context.addMappings = ServiceUtils.addMappings.bind(this);
		this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);
		this.context.enable = ServiceUtils.enable.bind(this);
	}

	writing() {
		//Stopgap solution while we get both approaches for laying down credentials:
		//fine-grained vs. coarse-grained
		this._transformCredentialsOutput();
		this.context.enable();
	}

	_addLocalDevConfig(serviceLocalDevConfigJSON) {
		let localDevConfigFilePath = this.destinationPath(PATH_LOCALDEV_CONFIG_FILE);
		this.fs.extendJSON(localDevConfigFilePath, serviceLocalDevConfigJSON);
	}

	_getServiceInstanceName(bluemixKey) {
		// Lookup metadata object using bluemix/scaffolder key
		const serviceMetaData = this.context.application.service_credentials[bluemixKey];
		logger.debug(`_getServiceInstanceName - serviceMetaData=${JSON.stringify(serviceMetaData, null, 3)}`);

		if (!serviceMetaData) {
			return null;
		}
		const instanceName = serviceMetaData.hasOwnProperty('serviceInfo') ?
			serviceMetaData.serviceInfo : serviceMetaData[0].serviceInfo;
		return instanceName;
	}

	_createServiceCredentials(credentials, mappings, instanceName, prefix) {
		let serviceCredentials = {};
		credentials[instanceName] = serviceCredentials;
		// Note that environment variables should not use the '-' character
		const envVariableName = 'service_' + prefix
		mappings[prefix] = {
			"credentials": {
				"searchPatterns": [
					"cloudfoundry:" + instanceName,
					"env:" + envVariableName,
					FILE_SEARCH_PATH_PREFIX + instanceName
				]
			}
		};
		return serviceCredentials;
	}

	_transformCredentialsOutput() {
		// Swift overwrites the mappings and the local dev config file in the _transformCredentialsOutput() function below,
		// while we are awaiting fine-grained vs. coarse-grained approaches for laying down credential.

		// Get array with all the bluemix/scaffolder keys in the dictionary
		const bluemixKeys = Object.keys(bluemixLabelMappings);
		// Load the generated localdev-config.json
		// We will "massage" this file so it is compatible with CloudEnvironment
		const localDevConfig = this.fs.readJSON(this.destinationPath(PATH_LOCALDEV_CONFIG_FILE), {});

		// Get all keys from localdev-config.json
		const credentialItems = Object.keys(localDevConfig);

		// Initialize structure for storing credentials
		let credentials = {};
		// Generate a new mappings.json file in the format that CloudEnvironment expects
		let mappings = {};
		// Assign default value to labelPrefix
		let lastPrefix = "";

		if (credentialItems.length === 0) {
			logger.info("No credentials to process.");
			return;
		}

		for (let index in credentialItems) {
			const credentialItem = credentialItems[index];
			logger.debug("-----------------------------");
			logger.log(credentialItem + ": " + localDevConfig[credentialItem]);

			// Look up prefix and bluemix key for current credentials item
			let currentPrefix;
			let bluemixKey;
			for (let index in bluemixKeys) {
				const tmpKey = bluemixKeys[index];
				if (credentialItem.startsWith(bluemixLabelMappings[tmpKey])) {
					bluemixKey = tmpKey;
					currentPrefix = bluemixLabelMappings[bluemixKey];
					logger.debug("currentPrefix: " + currentPrefix);
					logger.debug("bluemixKey: " + bluemixKey);
					break;
				}
			}

			// Verify there was a match... otherwise continue
			if (!currentPrefix || !bluemixKey) {
				logger.warn("Could not find a mapping for: " + credentialItem);
				continue;
			}

			// Generate entry for mappings.json
			const instanceName = this._getServiceInstanceName(bluemixKey);

			if (!instanceName) {
				logger.error(`Service ${bluemixKey} was not provisioned`);
				continue;
			}

			// Are we processing a new credentials set or an existing one?
			let serviceCredentials;
			if (lastPrefix !== currentPrefix) {
				lastPrefix = currentPrefix;
				serviceCredentials = this._createServiceCredentials(credentials, mappings, instanceName, currentPrefix);
			} else {
				serviceCredentials = credentials[instanceName];
			}
			const item = credentialItem.substr(currentPrefix.length + 1, credentialItem.length);
			serviceCredentials[item] = localDevConfig[credentialItem];
		}
		logger.debug("-----------------------------");

		// Write new mappings.json and localdev-config.json files
		logger.debug("localdev-config.json: " + JSON.stringify(credentials));
		this.fs.writeJSON(this.destinationPath(PATH_LOCALDEV_CONFIG_FILE), credentials);
		logger.debug("mappings.json: " + JSON.stringify(mappings));
		this.fs.writeJSON(this.destinationPath(PATH_MAPPINGS_FILE), mappings);
	}

};
