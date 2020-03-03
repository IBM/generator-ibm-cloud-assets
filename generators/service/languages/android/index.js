'use strict';
const Log4js = require('log4js');
const xmlbuilder = require('xmlbuilder');
const fs = require('fs');
const logger = Log4js.getLogger("generator-ibm-cloud-assets:android");
const ServiceUtils = require('../../../lib/service-utils');
let Generator = require('yeoman-generator');

const CREDENTIALS_XML_FP = `app/src/main/res/values/credentials.xml`

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.info("Constructing android");
	}

	configuring(){
        this.context.addMappings = function () {/*Do not generate mappings.json*/}
		this.context.addLocalDevConfig = function () {/*Do not generate localdev-config*/}
		this.context.enable = ServiceUtils.enable.bind(this);
	}

	_generateCredentials(credentials, filePath, appName) {
		if ( typeof credentials === "object" && credentials) {
            credentials.appName = appName;
            const xmlString = xmlbuilder.create({resources: credentials }).end({ pretty: true });
            logger.info("Writing credentials.xml")
			fs.writeFile(this.destinationPath(filePath), xmlString, (err) => {
                logger.info("Failed to create credentials.xml")
            });
		} else { logger.info("Project does not contain credentials, not creating credentials.xml") }
	}

	writing() {
		this.context.enable()
		this._generateCredentials(this.context.application.service_credentials, CREDENTIALS_XML_FP, this.context.application.sanitizedName);
	}
};
