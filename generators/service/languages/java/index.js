/*
 * © Copyright IBM Corp. 2017, 2018
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
const logger = require('log4js').getLogger("generator-ibm-cloud-assets:languages-java");
const Generator = require('yeoman-generator');
const filesys = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const scaffolderMapping = require('../../templates/scaffolderMapping.json');

const Utils = require('../../../lib/utils');

const PATH_MAPPINGS_FILE = './src/main/resources/mappings.json';
const PATH_LOCALDEV_FILE = './src/main/resources/localdev-config.json';
const TEMPLATE_EXT = '.template';
const GENERATOR_LOCATION = 'server';

const PATH_GIT_IGNORE = "./.gitignore";

module.exports = class extends Generator {

	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.debug('Constructing');
	}

	//setup all the values we need to pass in the context
	initializing() {
		let serviceCredentials,
			scaffolderKey,
			serviceKey;
		this.context.dependenciesFile = 'config.json.template';
		this.context.languageFileExt = '';
		this.context.generatorLocation = GENERATOR_LOCATION;
		this.context.addDependencies = this._addDependencies.bind(this);
		this.context.addMappings = this._addMappings.bind(this);
		this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);
	}

	writing() {
		// add missing pom.xml dependencies when running service enablement standalone
		if (typeof this.context.parentContext === "undefined") {
			this._addJavaDependencies();
		}
		// Add PATH_LOCALDEV_CONFIG_FILE to .gitignore
		let gitIgnorePath = this.destinationPath(PATH_GIT_IGNORE);
		if (this.fs.exists(gitIgnorePath)){
			this.fs.append(gitIgnorePath, PATH_LOCALDEV_FILE);
		} else {
			this.fs.write(gitIgnorePath, PATH_LOCALDEV_FILE);
		}
	}

	_addDependencies(serviceDependenciesString) {
		logger.debug('Adding dependencies', serviceDependenciesString);
		this._processDependencyMetainf(serviceDependenciesString);
		if (this.context._addDependencies) {
			this.context._addDependencies(serviceDependenciesString);
		}
	}

	_addMappings(serviceMappingsJSON) {
		let mappingsFilePath = this.destinationPath(PATH_MAPPINGS_FILE);
		this.fs.extendJSON(mappingsFilePath, serviceMappingsJSON);
	}

	_addLocalDevConfig(devconf) {
		logger.debug('Adding devconf', devconf);
		if (this.context.bluemix) {
			let localDevFilePath = this.destinationPath(PATH_LOCALDEV_FILE);
			this.fs.extendJSON(localDevFilePath, devconf);
		} else {
			this.context._addLocalDevConfig(devconf);
		}
	}

	_addCoreDependencies() {
		let dependenciesString = this.fs.read(`${this.templatePath()}/${this.context.language}/${this.context.dependenciesFile}`);
		let template = handlebars.compile(dependenciesString);
		dependenciesString = template(this.context);
		if (this.context._addDependencies) {
			this.context._addDependencies(dependenciesString);
		}
	}

	_writeFiles(templatePath, data) {
		//do not write out any files that are marked as processing templates
		try {
			this.fs.copy([this.templatePath(templatePath), '!**/*.template'], this.destinationPath(), {
				process: function (contents) {
					let compiledTemplate = handlebars.compile(contents.toString());
					return compiledTemplate(data);
				}
			});
		} catch (e) {
			logger.warn(`No files to copy from ${this.templatePath(templatePath)}`);
		}
	}

	_addJavaDependencies() {
		let templateFilePath = this.templatePath(this.context.language+"/config.json.template");
		let pomFilePath = this.destinationPath() + '/pom.xml';
		if (this.fs.exists(templateFilePath) && this.fs.exists(pomFilePath)) {
			logger.info("Adding service dependencies for Java from template " + templateFilePath);
			let templateFile = this.fs.read(templateFilePath);
			let template = JSON.parse(templateFile);
			let pomContents = this.fs.read(pomFilePath, {encoding:'utf-8'});
			let xDOM = new DOMParser().parseFromString(pomContents, 'application/xml');
			// go through pom.xml and add missing non-provided dependencies from template
			let xArtifactIds = xDOM.getElementsByTagName("artifactId");
			let depsAdded = false;
			if (template["dependencies"]) {
				template["dependencies"].forEach(dep => {
					let depFound = false;
					let artifactId = dep["artifactId"];
					for (let i = 0; i < xArtifactIds.length; i++) {
						let xArtifactId = xArtifactIds[i];
						if (xArtifactId.textContent === artifactId) {
							depFound = true;
						}
					}
					if (!depFound) { // add missing dependency to pom
						let newXDep = xDOM.createElement("dependency");

						let newXGroupId = xDOM.createElement("groupId");
						newXGroupId.appendChild(xDOM.createTextNode(dep["groupId"]));
						let newXArtifactId = xDOM.createElement("artifactId");
						newXArtifactId.appendChild(xDOM.createTextNode(dep["artifactId"]));
						let newXVersion = xDOM.createElement("version");
						newXVersion.appendChild(xDOM.createTextNode(dep["version"]));

						newXDep.appendChild(newXGroupId);
						newXDep.appendChild(newXArtifactId);
						newXDep.appendChild(newXVersion);
						if (dep["scope"]) {
							let newXScope = xDOM.createElement("scope");
							newXScope.appendChild(xDOM.createTextNode(dep["scope"]));
							newXDep.appendChild(newXScope);
						}

						let xDeps = xDOM.getElementsByTagName("dependencies")[0];
						if (xDeps) {
							xDeps.appendChild(newXDep);
							depsAdded = true;
						}
					}
				});
			}
			if (depsAdded) {
				let newXml = prettifyxml(XMLSerializer.serializeToString(xDOM).replace(/ xmlns="null"/g, ''));
				this.fs.write(this.destinationPath() + '/pom.xml', newXml);
			}
		}
	}

	end() {
	}
};
