'use strict';
const Log4js = require('log4js');
const plist = require('plist');
const fs = require('fs');
const logger = Log4js.getLogger("generator-ibm-cloud-assets:ios-swift");
const ServiceUtils = require('../../../lib/service-utils');
let Generator = require('yeoman-generator');

const BMS_CREDENTIALS_FP = `iosapp/BMSCredentials.plist`

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.info("Constructing ios");
	}

	configuring(){
        this.context.addMappings = function () {/*Do not generate mappings.json*/}
		this.context.addLocalDevConfig = function () {/*Do not generate localdev-config*/}
		this.context.enable = ServiceUtils.enable.bind(this);
	}

	_generatePlist(credentials, filePath, appName) {
		if (typeof credentials === "object" && credentials) {
            credentials.appName = appName;
			const plistString = plist.build(credentials);
			logger.info("Writing BMSCredentials.plist")
			fs.writeFile(this.destinationPath(filePath), plistString, (err) => {
				logger.info("Failed to create BMSCredentials.plist")
			});
		} else { logger.info("Project does not contain credentials, not creating BMSCredentials.plist") }
	}

	writing() {
		this.context.enable()
		this._generatePlist(this.context.application.service_credentials, BMS_CREDENTIALS_FP, this.context.application.sanitizedName);
	}
};
