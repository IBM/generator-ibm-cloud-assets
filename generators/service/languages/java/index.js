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
const logger = require('log4js').getLogger("generator-ibm-cloud-assets:languages-java");
const Generator = require('yeoman-generator');
const filesys = require('fs');
const path = require('path');
const handlebars = require('handlebars');

const scaffolderMapping = require('../../templates/scaffolderMapping.json');
const svcInfo = require('../../templates/serviceInfo.json');
const Utils = require('../../../lib/utils');

const PATH_MAPPINGS_FILE = './src/main/resources/mappings.json';
const PATH_LOCALDEV_FILE = './src/main/resources/localdev-config.json';
const GENERATOR_LOCATION = 'server';

module.exports = class extends Generator {

	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.debug('Constructing');
	}

	//setup all the values we need to pass in the context
	initializing() {
		this.context.languageFileExt = '';
		this.context.generatorLocation = GENERATOR_LOCATION;
		this.context.addMappings = this._addMappings.bind(this);
		this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);
		this.context.srcFolders = [];
		this.context.instrumentationAdded = false;
		this.context.metainf = [];
		this._addJavaDependencies = Utils.addJavaDependencies.bind(this);

		let serviceCredentials,
			serviceKey;
		//initializing ourselves by composing with the service enabler
		let root = path.dirname(require.resolve('../../enabler'));
		Object.keys(svcInfo).forEach(svc => {
			serviceKey = svc;
			serviceCredentials = this.context.application.service_credentials[serviceKey];
			if (serviceCredentials) {
				this.context.scaffolderKey = serviceKey;
				logger.debug("Composing with service : " + svc);
				try {
					this.context.cloudLabel = serviceCredentials && serviceCredentials.serviceInfo && serviceCredentials.serviceInfo.cloudLabel;
					this.composeWith(root, {context: this.context});
				} catch (err) {
					/* istanbul ignore next */	//ignore for code coverage as this is just a warning - if the service fails to load the subsequent service test will fail
					logger.warn('Unable to compose with service', svc, err);
				}
			}
		});
	}

	writing() {
		// add missing pom.xml dependencies when running service enablement standalone
		if (typeof this.context.parentContext === "undefined") {
			this._addJavaDependencies();
		}
	}

	_addMappings(serviceMappingsJSON) {
		let mappingsFilePath = this.destinationPath(PATH_MAPPINGS_FILE);
		this.fs.extendJSON(mappingsFilePath, serviceMappingsJSON);
	}

	_addLocalDevConfig(devconf) {
		logger.debug('Adding devconf', devconf);
		if (this.context.application.service_credentials) {
			let localDevFilePath = this.destinationPath(PATH_LOCALDEV_FILE);
			this.fs.extendJSON(localDevFilePath, devconf);
		} else {
			this.context._addLocalDevConfig(devconf);
		}
	}

	_writeFiles(templatePath, data) {
		// TODO cleanup
		//do not write out any files that are marked as processing templates
		try {
			this.fs.copy([this.templatePath(templatePath), '!**/*.template'], this.destinationPath(), {
				process: function (contents) {
					let compiledTemplate = handlebars.compile(contents.toString());
					return compiledTemplate(data);
				}
			});
		} catch (e) {
			logger.warn(`No files to copy from ${this.templatePath(templatePath)}`);
		}
	}

	end() {
	}
};
