'use strict';
const Log4js = require('log4js');
const logger = Log4js.getLogger("generator-ibm-cloud-assets:languages-node-express");
const ServiceUtils = require('../../../lib/service-utils');
let Generator = require('yeoman-generator');

const GENERATE_HERE = "// GENERATE HERE";
const GENERATOR_LOCATION = 'server';

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
		this.context.addMappings = ServiceUtils.addMappings.bind(this);
		this.context.addLocalDevConfig = ServiceUtils.addLocalDevConfig.bind(this);
		this.context.enable = ServiceUtils.enable.bind(this);
	}

	writing() {
		this.context.enable()
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
