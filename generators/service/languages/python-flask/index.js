'use strict';
const Log4js = require('log4js');
const logger = Log4js.getLogger("generator-ibm-cloud-assets:languages-python-flask");
let Generator = require('yeoman-generator');
const fs = require('fs');
const path = require('path');

const Utils = require('../../../lib/utils');
const Handlebars = require('../../../lib/handlebars.js');
const scaffolderMapping = require('../../templates/scaffolderMapping.json');
const svcInfo = require('../../templates/serviceInfo.json');

const GENERATE_HERE = "# GENERATE HERE";
const GENERATOR_LOCATION = 'server';
const GENERATE_IMPORT_HERE = "# GENERATE IMPORT HERE";
const PATH_MAPPINGS_FILE = "./server/config/mappings.json";
const PATH_LOCALDEV_CONFIG_FILE = "server/localdev-config.json";
const PATH_REQUIREMENTS_TXT = "./requirements.txt";
const PATH_PIPFILE_JSON = "/Pipfile.json";
const PATH_GIT_IGNORE = "./.gitignore";
const PATH_PIPFILE = 'Pipfile';
const SERVICES_INIT_FILE = "__init__.py";
const SOURCES = '[[source]]';
const DEV_PACKAGES = '[dev-packages]';
const PACKAGES = '[packages]';
const SOURCES_CONTENT = "url = \"https://pypi.python.org/simple\"\n" +
	"verify_ssl = true\n" +
	"name = \"pypi\"";

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
		this.context.addMappings = this._addMappings.bind(this);
		this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);
	}

	writing() {

		/*
		this.fs.copy(
			this.templatePath() + "/service_manager.py",
			this.destinationPath("./server/services/service_manager.py")
		);

		this.fs.copy(
			this.templatePath() + "/services_index.py",
			this.destinationPath("./server/services/" + SERVICES_INIT_FILE)
		);
		*/

		let serviceCredentials,
			serviceKey;
		//initializing ourselves by composing with the service enabler
		let root = path.dirname(require.resolve('../../enabler'));
		Object.keys(svcInfo).forEach(svc => {
			serviceKey = svc;
			serviceCredentials = this.context.application.service_credentials[serviceKey];
			if (serviceCredentials) {
				this.context.scaffolderKey = serviceKey;
				logger.debug("Composing with service : " + svc);
				try {
					this.context.cloudLabel = serviceCredentials && serviceCredentials.serviceInfo && serviceCredentials.serviceInfo.cloudLabel;
					this.composeWith(root, {context: this.context});
				} catch (err) {
					/* istanbul ignore next */	//ignore for code coverage as this is just a warning - if the service fails to load the subsequent service test will fail
					logger.warn('Unable to compose with service', svc, err);
				}
			}
		});
	}

	_addMappings(serviceMappingsJSON) {
		let mappingsFilePath = this.destinationPath(PATH_MAPPINGS_FILE);
		this.fs.extendJSON(mappingsFilePath, serviceMappingsJSON);
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
