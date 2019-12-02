'use strict';
const Log4js = require('log4js');
const logger = Log4js.getLogger("generator-ibm-cloud-assets:languages-node-express");
const path = require('path');
let Generator = require('yeoman-generator');
const fs = require('fs');

const Utils = require('../../../lib/utils');
const scaffolderMapping = require('../../templates/scaffolderMapping.json');

const GENERATE_HERE = "// GENERATE HERE";
const GENERATOR_LOCATION = 'server';
const PATH_MAPPINGS_FILE = "./server/config/mappings.json";
const PATH_LOCALDEV_CONFIG_FILE = "server/localdev-config.json";
const PATH_PACKAGE_JSON = "./package.json";
const PATH_GIT_IGNORE = "./.gitignore";

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.debug("Constructing");
	}

	configuring(){
		this.context.dependenciesFile = "dependencies.json";
		this.context.languageFileExt = ".js";
		this.context.generatorLocation = GENERATOR_LOCATION;
		this.context.addDependencies = this._addDependencies.bind(this);
		this.context.addMappings = this._addMappings.bind(this);
		this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);
	}

	writing() {
		let serviceCredentials,
			scaffolderKey,
			serviceKey;
		this._addDependencies(this.fs.read(this.templatePath() + "/" + this.context.dependenciesFile));

		/*
		this.fs.copy(
			this.templatePath() + "/service-manager.js",
			this.destinationPath("./server/services/service-manager.js")
		);

		this.fs.copy(
			this.templatePath() + "/services-index.js",
			this.destinationPath("./server/services/index.js")
		);
		*/
		// Add PATH_LOCALDEV_CONFIG_FILE to .gitignore
		let gitIgnorePath = this.destinationPath(PATH_GIT_IGNORE);
		if (this.fs.exists(gitIgnorePath)){
			this.fs.append(gitIgnorePath, PATH_LOCALDEV_CONFIG_FILE);
		} else {
			this.fs.write(gitIgnorePath, PATH_LOCALDEV_CONFIG_FILE);
		}
	}

	_addDependencies(serviceDepdendenciesString){
		let serviceDependencies = JSON.parse(serviceDepdendenciesString);
		let packageJsonPath = this.destinationPath(PATH_PACKAGE_JSON);
		this.fs.extendJSON(packageJsonPath, serviceDependencies);
	}

	_addMappings(serviceMappingsJSON){
		let mappingsFilePath = this.destinationPath(PATH_MAPPINGS_FILE);
		this.fs.extendJSON(mappingsFilePath, serviceMappingsJSON);
	}

	_addLocalDevConfig(serviceLocalDevConfigJSON){
		let localDevConfigFilePath = this.destinationPath(PATH_LOCALDEV_CONFIG_FILE);
		this.fs.extendJSON(localDevConfigFilePath, serviceLocalDevConfigJSON);
	}

	end(){
		/*
		// Remove GENERATE_HERE from /server/services/index.js
		let servicesIndexJsFilePath = this.destinationPath("./server/services/index.js");
		let indexFileContent = this.fs.read(servicesIndexJsFilePath);
		indexFileContent = indexFileContent.replace(GENERATE_HERE, "");
		this.fs.write(servicesIndexJsFilePath, indexFileContent);
	  */
		// Add PATH_LOCALDEV_CONFIG_FILE to .gitignore
		let gitIgnorePath = this.destinationPath(PATH_GIT_IGNORE);
		if (this.fs.exists(gitIgnorePath)){
			this.fs.append(gitIgnorePath, PATH_LOCALDEV_CONFIG_FILE);
		} else {
			this.fs.write(gitIgnorePath, PATH_LOCALDEV_CONFIG_FILE);
		}
	}
};
