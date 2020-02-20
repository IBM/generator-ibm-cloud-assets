'use strict';
const Log4js = require('log4js');
const logger = Log4js.getLogger("generator-ibm-cloud-assets:languages-node-express");
const path = require('path');
let Generator = require('yeoman-generator');
const Utils = require('../../../lib/service-utils');

const scaffolderMapping = require('../../templates/scaffolderMapping.json');
const svcInfo = require('../../templates/serviceInfo.json');

const GENERATE_HERE = "// GENERATE HERE";
const GENERATOR_LOCATION = 'server';
const PATH_MAPPINGS_FILE = "./server/config/mappings.json";
const PATH_LOCALDEV_CONFIG_FILE = "server/localdev-config.json";

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.debug("Constructing");
	}

	configuring(){
		this.context.languageFileExt = ".js";
		this.context.generatorLocation = GENERATOR_LOCATION;
		this.context.addMappings = this._addMappings.bind(this);
		this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);
		this.context.enable = Utils.enable.bind(this);
	}

	writing() {
		this.context.enable()
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
		// Remove GENERATE_HERE from /server/services/index.js
		let servicesIndexJsFilePath = this.destinationPath("./server/services/index.js");
		if (this.fs.exists(servicesIndexJsFilePath)) {
			let indexFileContent = this.fs.read(servicesIndexJsFilePath);
			indexFileContent = indexFileContent.replace(GENERATE_HERE, "");
			this.fs.write(servicesIndexJsFilePath, indexFileContent);
		}
	}
};
