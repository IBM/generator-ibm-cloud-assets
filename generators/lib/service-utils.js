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

'use strict'
const Log4js = require('log4js');
const logger = Log4js.getLogger("generator-ibm-cloud-assets:ServiceUtils");
const readline = require('readline');
const fs = require('fs');
const yaml = require('js-yaml');
const _ = require('lodash');
const path = require('path');

const SPRING_BOOT_SERVICE_NAME = "spring_boot_service_name";
const SPRING_BOOT_SERVICE_KEY_SEPARATOR = "spring_boot_service_key_separator";

// consts used for deployment.yml
const REGEX_PORT = /^(\s*)- name: PORT/;

const _credentialsFilepathMap = {
	JAVA: "src/main/resources/credentials.json",
	SPRING: "src/main/resources/credentials.json",
	NODE: "server/credentials.json",
	PYTHON: "server/credentials.json",
	SWIFT: "config/credentials.json",
	DJANGO: "server/credentials.json",
	GO: "server/credentials.json",
	IOS_SWIFT: "credentials.json",
	ANDROID: "credentials.json"
}

const _mappingsFilepathMap = {
	JAVA: "./src/main/resources/mappings.json",
	SPRING: "./src/main/resources/mappings.json",
	NODE: "./server/config/mappings.json",
	PYTHON: "./server/config/mappings.json",
	SWIFT: "./config/mappings.json",
	DJANGO: "./server/config/mappings.json",
	GO: "./server/config/mappings.json"
}

const _localDevConfigFilepathMap = {
	JAVA: "./src/main/resources/localdev-config.json",
	SPRING: "./src/main/resources/localdev-config.json",
	NODE: "server/localdev-config.json",
	PYTHON: "server/localdev-config.json",
	SWIFT: "./config/localdev-config.json",
	DJANGO: "server/localdev-config.json",
	GO: "server/localdev-config.json",
	IOS_SWIFT: "localdev-config.json",
	ANDROID: "localdev-config.json"
}

// add secretKeyRefs for services in deployment.yaml
function addServicesEnvToHelmChartAsync(args) {
	return new Promise((resolve, reject) => {
		let context = args.context;
		let destinationPath = args.destinationPath;

		logger.level = context.loggerLevel;

		let hasServices = context.deploymentServicesEnv && context.deploymentServicesEnv.length > 0;
		if (!hasServices) {
			logger.info('No services to add');
			return resolve();
		}

		// the helm chart should've been generated in the kubernetes generator
		// for deploy to Kubernetes using Helm chart
		let chartFolderPath = `${destinationPath}/chart`;
		if (!fs.existsSync(chartFolderPath)) {
			logger.info('/chart folder does not exist');
			return resolve();
		}

		let deploymentFilePath = `${chartFolderPath}/${context.sanitizedAppName}/templates/deployment.yaml`;
		let deploymentFileExists = fs.existsSync(deploymentFilePath);
		logger.info(`deployment.yaml exists (${deploymentFileExists}) at ${deploymentFilePath}`);

		if (!deploymentFileExists) {
			logger.info(`Can't find required yaml files, checking /chart directory`);

			// chart could've been created with different name than expected
			// there should only be one folder under /chart, but just in case
			let chartFolders = fs.readdirSync(`${chartFolderPath}`);
			for (let i = 0; i < chartFolders.length; i++) {

				deploymentFilePath = `${chartFolderPath}/${chartFolders[i]}/templates/deployment.yaml`;
				deploymentFileExists = fs.existsSync(deploymentFilePath);
				if (deploymentFileExists) {
					logger.info(`deployment.yaml exists at ${deploymentFilePath}`);
					break;
				}
			}
		}

		if (deploymentFileExists) {
			logger.info(`Adding ${context.deploymentServicesEnv.length} to env in deployment.yaml`);
			return appendDeploymentYaml(deploymentFilePath, context.deploymentServicesEnv, resolve, reject);
		} else {
			logger.error('deployment.yaml not found, cannot add services to env');
			return resolve();
		}
	});
}

function appendDeploymentYaml(deploymentFilePath, services, resolve, reject) {
	//TODO: we should use jsyaml read writes instead of string injection
	let readStream = fs.createReadStream(deploymentFilePath);
	let promiseIsRejected = false;
	readStream.on('error', (err) => {
		logger.error('failed to read deployment.yaml from filesystem: ' + err.message);
		reject(err);
		promiseIsRejected = true;
	});

	let envSection = false;
	let deploymentFileString = '';
	let rl = readline.createInterface({ input: readStream });
	rl.on('line', (line) => {    				   // to append the secretKeyRef above the port inside env
		envSection |= (line.indexOf('env:') > -1); // did we find env: yet?
		if (envSection) { 						   // we found env, look for -name: PORT, will insert above that
			let match = line.match(REGEX_PORT);    // regex, captures leading whitespace
			if (match !== null) {
				deploymentFileString += generateSecretKeyRefsDeployment(services, `${match[1]}`);
				envSection = false;                // all done with env section.
			}
		}

		// NOW append the line to the string
		deploymentFileString += `${line}\n`;

	}).on('close', () => {
		if (promiseIsRejected) { return; }
		fs.writeFile(deploymentFilePath, deploymentFileString, (err) => {
			if (err) {
				logger.error('failed to write updated deployment.yaml to filesystem: ' + err.message);
				reject(err);
			} else {
				logger.info('finished updating deployment.yaml and wrote to filesystem');
				resolve();
			}
		});
	});
}

// add services section with secretKeyRefs in values.yaml
function addServicesEnvToValuesAsync(args) {
	return new Promise((resolve, reject) => {
		let context = args.context;
		logger.level = context.loggerLevel;

		let hasServices = context.deploymentServicesEnv && context.deploymentServicesEnv.length > 0;
		if (!hasServices) {
			logger.info('No services to add');
			return resolve();
		}

		// values.yaml should've been generated in the kubernetes sub-generator
		// for deploy to Kubernetes using Helm chart
		let chartFolderPath = `${args.destinationPath}/chart`;
		if (!fs.existsSync(chartFolderPath)) {
			logger.info('/chart folder does not exist');
			return resolve();
		}

		let valuesFilePath = `${chartFolderPath}/${context.sanitizedAppName}/values.yaml`;
		let valuesFileExists = fs.existsSync(valuesFilePath);
		logger.info(`values.yaml exists (${valuesFileExists}) at ${valuesFilePath}`);

		if (!valuesFileExists) {
			logger.info(`Can't find values.yaml, checking /chart directory`);

			// chart could've been created with different name than expected
			// there should only be one folder under /chart, but just in case
			let chartFolders = fs.readdirSync(`${chartFolderPath}`);
			for (let i = 0; i < chartFolders.length; i++) {
				valuesFilePath = `${chartFolderPath}/${chartFolders[i]}/values.yaml`;
				valuesFileExists = fs.existsSync(valuesFilePath);
				logger.info(`values.yaml exists (${valuesFileExists}) at ${valuesFilePath}`);
				if (valuesFileExists) { break; }
			}
		}

		if (!valuesFileExists) {
			logger.error('values.yaml not found, cannot add services');
			return resolve();
		}

		//TODO: we should use jsyaml read writes instead of string injection
		let readStream = fs.createReadStream(valuesFilePath);
		let promiseIsRejected = false;
		readStream.on('error', (err) => {
			logger.error('failed to read values.yaml from filesystem: ' + err.message);
			reject(err);
			promiseIsRejected = true;
		});
		let rl = readline.createInterface({ input: readStream });

		let valuesFileString = '', servicesSectionBool = false, addToEnd = true;

		rl.on('line', (line) => {
			valuesFileString += `${line}\n`;
			servicesSectionBool = line.indexOf('services:') > -1
			if (servicesSectionBool) { // add secretKeyRefs to existing services: section
				valuesFileString += generateSecretRefsValues(context.deploymentServicesEnv);
				servicesSectionBool = false;
				addToEnd = false;
			}

		}).on('close', () => {
			if (promiseIsRejected) { return; }
			if (addToEnd) {  // need to add a new services: section
				valuesFileString += "services:\n";
				valuesFileString += generateSecretRefsValues(context.deploymentServicesEnv);
			}
			fs.writeFile(valuesFilePath, valuesFileString, (err) => {
				if (err) {
					logger.error('failed to write updated values.yaml to filesystem: ' + err.message);
					reject(err);
				} else {
					logger.info('finished updating values.yaml and wrote to filesystem');
					resolve();
				}
			});
		});

		logger.info(`Adding ${context.deploymentServicesEnv.length} services in values.yaml`);
	});
}

/**
 *  Some Spring dependencies need a specific service name and
 *  cred key names... 'cause Spring is extra special :-)
 */
const SPRING_SERVICE_KEY_MAP =
{
	"cloud-object-storage": {
		"spring_boot_service_name": "cos",
		"spring_boot_service_key_separator": ".",
		"apikey": "api-key",
		"resource_instance_id": "service_instance_id"
	}
}

function getSpringServiceInfo(regularServiceKey) {
	let value = null;
	if (regularServiceKey in SPRING_SERVICE_KEY_MAP) {
		value = SPRING_SERVICE_KEY_MAP[regularServiceKey];
	}
	return value;
}

function generateSecretKeyRefsDeployment(services, prefix) {
	let servicesEnvString = '';
	services.forEach((serviceEntry) => {
		servicesEnvString +=
			`${prefix}- name: ${serviceEntry.name}\n` +
			`${prefix}  valueFrom:\n` +
			`${prefix}    secretKeyRef:\n` +
			`${prefix}      name: ${serviceEntry.valueFrom.secretKeyRef.name}\n` +
			`${prefix}      key: ${serviceEntry.valueFrom.secretKeyRef.key}\n` +
			`${prefix}      optional: true\n`;
		logger.trace(`generateSecretKeyRefsDeployment - adding servicesEnvString=${servicesEnvString}`);
	});
	return servicesEnvString;
}

function generateSecretRefsValues(services) {
	let servicesEnvString = '';
	services.forEach((serviceEntry) => {
		servicesEnvString +=
			`  ${serviceEntry.scaffolderName}:\n` +
			`    secretKeyRef: ${serviceEntry.keyName}\n`;
		logger.trace(`generateSecretRefsValues - adding servicesEnvString=${servicesEnvString}`);
	});
	return servicesEnvString;
}

function _enable() {
	let serviceCredentials;

	//initializing ourselves by composing with the service enabler
	let root = path.dirname(require.resolve('../service/enabler'));
	Object.keys(this.context.application.service_credentials).forEach(serviceKey => {
		serviceCredentials = this.context.application.service_credentials[serviceKey];
		this.context.scaffolderKey = serviceKey;
		logger.debug("Composing with service : " + serviceKey);
		try {
			// this.context.cloudLabel appears to always be undefined
			this.context.cloudLabel = serviceCredentials && serviceCredentials.serviceInfo && serviceCredentials.serviceInfo.cloudLabel;
			this.composeWith(root, { context: this.context });
		} catch (err) {
			/* istanbul ignore next */	//ignore for code coverage as this is just a warning - if the service fails to load the subsequent service test will fail
			logger.warn('Unable to compose with service', serviceKey, err);
		}
	});
}

function _addMappings(serviceMappingsJSON) {
	let mappingsFilePath = this.destinationPath(_mappingsFilepathMap[this.context.application.language]);
	this.fs.extendJSON(mappingsFilePath, serviceMappingsJSON);
}

function _addLocalDevConfig(serviceLocalDevConfigJSON) {
	let localDevConfigFilePath = this.destinationPath(_localDevConfigFilepathMap[this.context.application.language]);
	this.fs.extendJSON(localDevConfigFilePath, serviceLocalDevConfigJSON);
}

module.exports = {
	getSpringServiceInfo: getSpringServiceInfo,
	SPRING_BOOT_SERVICE_NAME: SPRING_BOOT_SERVICE_NAME,
	SPRING_BOOT_SERVICE_KEY_SEPARATOR: SPRING_BOOT_SERVICE_KEY_SEPARATOR,
	addServicesEnvToHelmChartAsync: addServicesEnvToHelmChartAsync,
	addServicesEnvToValuesAsync: addServicesEnvToValuesAsync,
	credentialsFilepathMap: _credentialsFilepathMap,
	localDevConfigFilepathMap: _localDevConfigFilepathMap,
	mappingsFilepathMap: _mappingsFilepathMap,
	enable: _enable,
	addMappings: _addMappings,
	addLocalDevConfig: _addLocalDevConfig
};
