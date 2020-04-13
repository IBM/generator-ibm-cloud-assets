'use strict';
const Log4js = require('log4js');
const logger = Log4js.getLogger("generator-ibm-cloud-assets:languages-node-express");
const ServiceUtils = require('../../../lib/service-utils');
let Generator = require('yeoman-generator');

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.debug("Constructing");
	}

	configuring(){
		this.context.addMappings = ServiceUtils.addMappings.bind(this);
		this.context.addLocalDevConfig = ServiceUtils.addLocalDevConfig.bind(this);
		this.context.enable = ServiceUtils.enable.bind(this);
	}

	writing() {
		this.context.enable()
	}
};
