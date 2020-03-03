'use strict';
const Log4js = require('log4js');
const logger = Log4js.getLogger("generator-ibm-cloud-assets:languages-python-flask");
let Generator = require('yeoman-generator');
const ServiceUtils = require('../../../lib/service-utils');

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.debug("Constructing");
	}

	configuring() {
		this.context.addMappings = ServiceUtils.addMappings.bind(this);
		this.context.addLocalDevConfig = ServiceUtils.addLocalDevConfig.bind(this);
		this.context.enable = ServiceUtils.enable.bind(this);
	}

	writing() {
		this.context.enable()
	}
	
};
