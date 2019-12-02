/*
 * © Copyright IBM Corp. 2018
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
const Log4js = require('../java/node_modules/log4js');
const logger = Log4js.getLogger("generator-ibm-cloud-assets:languages-go");
let Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');

const Utils = require('../../../lib/utils');
const Handlebars = require('../../../lib/handlebars.js');
const scaffolderMapping = require('../../templates/scaffolderMapping.json');

const GENERATOR_LOCATION = 'server';
const PATH_MAPPINGS_FILE = "./server/config/mappings.json";
const PATH_LOCALDEV_CONFIG_FILE = "server/localdev-config.json";
const PATH_GIT_IGNORE = "./.gitignore";
const PATH_GOPKG = "Gopkg.toml"
const PATH_GOPKG_TOML = "./Gopkg.toml";


module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.debug("Constructing");
	}

	configuring() {
		this.context.addServices = false;
		this.context.service_imports = [];
		this.context.service_variables = [];
		this.context.service_initializers = [];
		this.context.dependencies = [];
		this.context.dependenciesFile = "dependencies.toml";
		this.context.languageFileExt = ".go";
		this.context.generatorLocation = GENERATOR_LOCATION;
		this.context.addDependencies = this._addDependencies.bind(this);
		this.context.addMappings = this._addMappings.bind(this);
		this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);

		let serviceCredentials,
			scaffolderKey,
			serviceKey;
	}

	writing() {
		// Generate services.go, which acts like a service manager
		if (this.context.addServices) {
			// Add the ibm-cloud-env-golang dependency
			this._addDependencies(this.fs.read(this.templatePath() + "/" + this.context.dependenciesFile));
			this._writeHandlebarsFile('services.go', "services/services.go", {
				service_imports: this.context.service_imports,
				service_variables:this.context.service_variables,
				service_initializers: this.context.service_initializers
			});
		}

		// Append dependencies to the Gopkg.toml
		let goPkgPath = this.destinationPath(PATH_GOPKG_TOML);
		// Write a Gopkg.toml if one doesn't exist
		if (!this.fs.exists(goPkgPath)) {
			this.fs.copy(this.templatePath() + "/" + PATH_GOPKG, this.destinationPath(PATH_GOPKG_TOML));
		}
		this.context.dependencies.forEach((dependency) => {
			let fileContentString = this.fs.read(this.destinationPath(PATH_GOPKG));
			// Append if not already found
			if (fileContentString.indexOf(dependency) === -1) {
				this.fs.append(this.destinationPath(PATH_GOPKG), dependency);
			}
		});
		// Add PATH_LOCALDEV_CONFIG_FILE to .gitignore
		let gitIgnorePath = this.destinationPath(PATH_GIT_IGNORE);
		if (this.fs.exists(gitIgnorePath)){
			this.fs.append(gitIgnorePath, PATH_LOCALDEV_CONFIG_FILE);
		} else {
			this.fs.write(gitIgnorePath, PATH_LOCALDEV_CONFIG_FILE);
		}
	}

	_addDependencies(serviceDepdendenciesString) {
		this.context.dependencies.push(serviceDepdendenciesString);
	}

	_addMappings(serviceMappingsJSON) {
		let mappingsFilePath = this.destinationPath(PATH_MAPPINGS_FILE);
		this.fs.extendJSON(mappingsFilePath, serviceMappingsJSON);
	}

	_addLocalDevConfig(serviceLocalDevConfigJSON){
		let localDevConfigFilePath = this.destinationPath(PATH_LOCALDEV_CONFIG_FILE);
		this.fs.extendJSON(localDevConfigFilePath, serviceLocalDevConfigJSON);
	}

	end(){
		// Add PATH_LOCALDEV_CONFIG_FILE to .gitignore
		let gitIgnorePath = this.destinationPath(PATH_GIT_IGNORE);
		if (this.fs.exists(gitIgnorePath)){
			this.fs.append(gitIgnorePath, PATH_LOCALDEV_CONFIG_FILE);
		} else {
			this.fs.write(gitIgnorePath, PATH_LOCALDEV_CONFIG_FILE);
		}
	}

	_writeHandlebarsFile(templateFile, destinationFile, data) {
		let template = this.fs.read(this.templatePath(templateFile));
		let compiledTemplate = Handlebars.compile(template);
		let output = compiledTemplate(data);
		this.fs.write(this.destinationPath(destinationFile), output);
	}

};
