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

const Log4js = require('log4js');
const logger = Log4js.getLogger('generator-ibm-cloud-assets:service');
const Generator = require('yeoman-generator');
const xmlbuilder = require('xmlbuilder');
const plist = require('plist');
const fs = require('fs');

const ServiceUtils = require('../lib/service-utils');
const Utils = require('../lib/utils');

const Bundle = require("./../../package.json");

const REGEX_LEADING_ALPHA = /^[^a-zA-Z]*/;
const REGEX_ALPHA_NUM = /[^a-zA-Z0-9]/g;

const BMS_CREDENTIALS_FP = `iosapp/BMSCredentials.plist`
const CREDENTIALS_XML_FP = `app/src/main/res/values/credentials.xml`

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

		let context = this.parentContext || {};
		context.deploy_options = {};
		context.deploy_options = Object.assign(context.deploy_options, opts.deploy_options);
		logger.debug(`Constructing - context.deploy_options: ${JSON.stringify(context.deploy_options, null, 3)}`);
		context.application = {};
		context.application = Object.assign(context.application, opts.application);
		logger.debug(`Constructing - context.application: ${JSON.stringify(context.application, null, 3)}`);

		context.starter = opts.starter || {};
		context.loggerLevel = logger.level;
		context.sanitizedAppName = this._sanitizeAppName(context.application.name);

		if (this.parentContext) {	// set a parent context to let the language generator know if there is a parent
			context.parentContext = this.parentContext;
		}
		this.context = context;
	}

	intializing() {
		let context = this.context;
		let languageGeneratorPath = "";
		switch (context.application.language.toLowerCase()) {
			case "node":
				languageGeneratorPath = './languages/node-express';
				break;
			case "python":
			case "django":
				languageGeneratorPath = './languages/python';
				break;
			case "java":
			case "spring":
				languageGeneratorPath = './languages/java';
				break;
			case "swift":
				languageGeneratorPath = './languages/swift-kitura';
				break;
			case "go":
				languageGeneratorPath = './languages/go'
				break;
			case "android":
				this._generateCredentialsAndroid(this.context.application.service_credentials, CREDENTIALS_XML_FP, this.context.sanitizedAppName)
				break;
			case "ios_swift":
				this._generatePlistIOS(this.context.application.service_credentials, BMS_CREDENTIALS_FP, this.context.sanitizedAppName)			
				break;
			default:
				logger.info(`No match found for language ${context.application.language.toLowerCase()}`)
		}

		if (languageGeneratorPath) {
			logger.info(`Composing with ${languageGeneratorPath}`);
			this.composeWith(require.resolve(languageGeneratorPath), {context: context});				
		} else { logger.info(`Not running language subgen for language ${context.application.language.toLowerCase()}`) }

	}

	_sanitizeAppName(name) {
		let cleanName = "";
		if (name !== undefined) {
			cleanName = name.replace(REGEX_LEADING_ALPHA, '').replace(REGEX_ALPHA_NUM, '');
		}
		return (cleanName || 'APP').toLowerCase();
	}

	_generateCredentialsAndroid(credentials, filePath, appName) {
		if ( typeof credentials === "object" && credentials) {
            credentials.appName = appName;
            const xmlString = xmlbuilder.create({resources: credentials }).end({ pretty: true });
            logger.info("Writing credentials.xml")
			fs.writeFile(this.destinationPath(filePath), xmlString, (err) => {
				if (err && filePath !== "./") {
					logger.info("Failed to create credentials.xml")
				// this._generateCredentialsAndroid(credentials, "./", appName);
				}
            });
		} else { logger.info("Project does not contain credentials, not creating credentials.xml") }
	}

	_generatePlistIOS(credentials, filePath, appName) {
		if (typeof credentials === "object" && credentials) {
            credentials.appName = appName;
			const plistString = plist.build(credentials);
			logger.info("Writing BMSCredentials.plist")
			fs.writeFile(this.destinationPath(filePath), plistString, (err) => {
				if (err && filePath !== "./") {
					logger.info("Failed to create BMSCredentials.plist")
				//  this._generatePlist(credentials, "./", appName); 
				}
			});
		} else { logger.info("Project does not contain credentials, not creating BMSCredentials.plist") }
	}

	end() {
		// add services secretKeyRefs to deployment.yaml &&
		// add services secretKeyRefs to values.yaml &&
		// add secretKeyRefs to service.yaml
		// all fail gracefully
		return ServiceUtils.addServicesEnvToHelmChartAsync({context: this.context, destinationPath: this.destinationPath()})
			.then(() => ServiceUtils.addServicesEnvToValuesAsync({context: this.context, destinationPath: this.destinationPath()}))
			.then(() => ServiceUtils.addServicesToServiceKnativeYamlAsync({context: this.context, destinationPath: this.destinationPath(Utils.PATH_KNATIVE_YAML)}));
	}

};
