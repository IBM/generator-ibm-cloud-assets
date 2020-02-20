'use strict';
const Log4js = require('log4js');
const logger = Log4js.getLogger("generator-ibm-cloud-assets:languages-python-flask");
let Generator = require('yeoman-generator');
const ServiceUtils = require('../../../lib/service-utils');
const Handlebars = require('../../../lib/handlebars.js');
const GENERATOR_LOCATION = 'server';
const PATH_LOCALDEV_CONFIG_FILE = "server/localdev-config.json";

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.debug("Constructing");
	}

	configuring() {
		this.context.languageFileExt = ".py";
		this.context.generatorLocation = GENERATOR_LOCATION;
		this.context.addMappings = ServiceUtils.addMappings.bind(this);
		this.context.addLocalDevConfig = ServiceUtils.addLocalDevConfig.bind(this);
		this.context.enable = ServiceUtils.enable.bind(this);
	}

	writing() {
		this.context.enable()
	}



	_addLocalDevConfig(serviceLocalDevConfigJSON) {
		let localDevConfigFilePath = this.destinationPath(PATH_LOCALDEV_CONFIG_FILE);
		this.fs.extendJSON(localDevConfigFilePath, serviceLocalDevConfigJSON);
	}

	_writeHandlebarsFile(templateFile, destinationFile, data) {
		let template = this.fs.read(this.templatePath(templateFile));
		let compiledTemplate = Handlebars.compile(template);
		let output = compiledTemplate(data);
		this.fs.write(this.destinationPath(destinationFile), output);
	}

	end() {
		// Remove GENERATE_HERE and GENERATE_IMPORT_HERE from SERVICES_INIT_FILE
		/*
		let servicesInitFilePath = this.destinationPath("./server/services/" + SERVICES_INIT_FILE);
		let indexFileContent = this.fs.read(servicesInitFilePath);
		indexFileContent = indexFileContent.replace(GENERATE_HERE, "").replace(GENERATE_IMPORT_HERE, "");
		this.fs.write(servicesInitFilePath, indexFileContent);
		*/
	}
};
