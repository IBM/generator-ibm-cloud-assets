'use strict'
const Log4js = require('log4js');
const logger = Log4js.getLogger("generator-ibm-service-enablement:ServiceUtils");
const readline = require('readline');
const fs = require('fs');
const yaml = require('js-yaml');

const SPRING_BOOT_SERVICE_NAME = "spring_boot_service_name";
const SPRING_BOOT_SERVICE_KEY_SEPARATOR = "spring_boot_service_key_separator";

// consts used for deployment.yml
const REGEX_PORT = /^(\s*)- name: PORT/;

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

		// the helm chart should've been generated in the generator-ibm-cloud-enablement generator
		// for deploy to Kubernetes using Helm chart
		let chartFolderPath = `${destinationPath}/chart`;
		if (!fs.existsSync(chartFolderPath)) {
			logger.info('/chart folder does not exist');
			return resolve();
		}

		let deploymentFilePath = `${chartFolderPath}/${context.sanitizedAppName}/templates/deployment.yaml`;
		let deploymentFileExists = fs.existsSync(deploymentFilePath);
		logger.info(`deployment.yaml exists (${deploymentFileExists}) at ${deploymentFilePath}`);

		if ( !deploymentFileExists ){
			logger.info(`Can't find required yaml files, checking /chart directory`);

			// chart could've been created with different name than expected
			// there should only be one folder under /chart, but just in case
			let chartFolders = fs.readdirSync(`${chartFolderPath}`);
			for (let i = 0; i < chartFolders.length; i++) {

				deploymentFilePath = `${chartFolderPath}/${chartFolders[i]}/templates/deployment.yaml`;
				deploymentFileExists = fs.existsSync(deploymentFilePath);
				logger.info(`deployment.yaml exists (${deploymentFileExists}) at ${deploymentFilePath}`);

				if (deploymentFileExists) {
					break;
				}
			}
		}

		if ( deploymentFileExists ) {
			logger.info(`Adding ${context.deploymentServicesEnv.length} to env in deployment.yaml` );
			return appendDeploymentYaml(deploymentFilePath, context.deploymentServicesEnv, resolve, reject);
		} else {
			logger.error('deployment.yaml not found, cannot add services to env');
			return resolve();
		}
	});
}

function appendDeploymentYaml(deploymentFilePath, services, resolve, reject) {
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
	rl.on('line', (line) => {
		envSection |= (line.indexOf('env:') > -1); // did we find env: yet?
		if (envSection) { // we found env, look for -name: PORT, will insert above that
			let match = line.match(REGEX_PORT); // regex, captures leading whitespace
			if (match !== null) {
				deploymentFileString += generateSecretKeyRefsDeployment(services, `${match[1]}`);
				envSection = false;               // all done with env section.
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

function addServicesToServiceKnativeYamlAsync(args) {
	return new Promise((resolve) => {
		console.log("knative yaml")
		console.log(args)
		let serviceYamlFilePath = "./service.yaml"; //args.destinationPath
		let services = args.context.deploymentServicesEnv; //array of service objects

		let hasServices = services && services.length > 0;
		if (!fs.existsSync(serviceYamlFilePath) || !hasServices) {
			logger.info("Not adding service env to service-knative.yaml");
			return resolve()
		}

		let serviceYamlContents = yaml.safeLoad(fs.readFileSync(serviceYamlFilePath, 'utf8'));

		services = services.filter(service => {
			return service.name && service.keyName && service.valueFrom &&
				service.valueFrom.secretKeyRef && service.valueFrom.secretKeyRef.key
		});

		services = services.map((service) => {
			return {
				name: service.name,
				valueFrom: {
					secretKeyRef: {
						name: service.keyName.toLowerCase(),
						key: service.valueFrom.secretKeyRef.key
					}
				}
			}
		})

		if (serviceYamlContents.spec.template.spec.containers[0].env) {
			logger.info("Env already exists in service-knative.yaml, not overwriting with services");
			return resolve()
		}
		serviceYamlContents.spec.template.spec.containers[0].env = services

		logger.info("Adding service env to service-knative.yaml");

		fs.writeFileSync(serviceYamlFilePath, yaml.safeDump(serviceYamlContents))

		return resolve();
	});

}


// add services section with secretKeyRefs in values.yaml
function addServicesEnvToValuesAsync(args) {
	return new Promise((resolve, reject) => {
		let context = args.context;
		let destinationPath = args.destinationPath;

		logger.level = context.loggerLevel;

		let hasServices = context.deploymentServicesEnv && context.deploymentServicesEnv.length > 0;
		if (!hasServices) {
			logger.info('No services to add');
			return resolve();
		}

		// values.yaml should've been generated in the generator-ibm-cloud-enablement generator
		// for deploy to Kubernetes using Helm chart
		let chartFolderPath = `${destinationPath}/chart`;
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
		"cloud-object-storage" : {
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
	});
	return servicesEnvString;
}

function generateSecretRefsValues(services) {
	let servicesEnvString = '';
	services.forEach((serviceEntry) => {
		servicesEnvString +=
			`  ${serviceEntry.scaffolderName}:\n` +
			`    secretKeyRef: ${serviceEntry.keyName}\n`;
	});
	return servicesEnvString;
}

module.exports = {
	getSpringServiceInfo: getSpringServiceInfo,
	SPRING_BOOT_SERVICE_NAME: SPRING_BOOT_SERVICE_NAME,
	SPRING_BOOT_SERVICE_KEY_SEPARATOR: SPRING_BOOT_SERVICE_KEY_SEPARATOR,
	addServicesEnvToHelmChartAsync: addServicesEnvToHelmChartAsync,
	addServicesEnvToValuesAsync: addServicesEnvToValuesAsync,
	addServicesToServiceKnativeYamlAsync: addServicesToServiceKnativeYamlAsync
};
