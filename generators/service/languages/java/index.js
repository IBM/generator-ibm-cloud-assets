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
const handlebars = require('handlebars');
const ServiceUtils = require('../../../lib/service-utils');

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
		this.context.addMappings = ServiceUtils.addMappings.bind(this);
		this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);
		this.context.srcFolders = [];
		this.context.instrumentationAdded = false;
		this.context.metainf = [];
		this._addJavaDependencies = Utils.addJavaDependencies.bind(this);
		this.context.enable = ServiceUtils.enable.bind(this);

	}

	writing() {
		// add missing pom.xml dependencies when running service enablement standalone
		if (typeof this.context.parentContext === "undefined") {
			this._addJavaDependencies();
		}
		this.context.enable()
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

};
