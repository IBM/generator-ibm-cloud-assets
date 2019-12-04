/*
 © Copyright IBM Corp. 2017, 2018
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */


// module for utils

'use strict';

const logger = require('log4js').getLogger("generator-ibm-cloud-assets:utils");
const Handlebars = require('../lib/handlebars');
const Glob = require('glob');
const _ = require('lodash');
const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const DOMParser = new JSDOM().window.DOMParser;
const XMLSerializer = require('xmlserializer');
const prettifyxml = require('prettify-xml');

const REGEX_LEADING_ALPHA = /^[^a-zA-Z]*/;
const REGEX_ALPHA_NUM = /[^a-zA-Z0-9]/g;
const REGEX_ALPHA_NUM_DASH = /[^a-zA-Z0-9-]/g;

const PATH_KNATIVE_YAML = "./service.yaml";

const sanitizeAlphaNumLowerCase = (name) => {
	return sanitizeAlphaNum(name).toLowerCase();
};

const sanitizeAlphaNum = (name) => {
	let cleanName = '';
	if (name != undefined) {
		cleanName = name.replace(REGEX_LEADING_ALPHA, '').replace(REGEX_ALPHA_NUM, '');
	}
	return (cleanName || 'APP');
};

function _writeHandlebarsFile(_this, templateFile, destinationFile, data) {
	let template = _this.fs.read(_this.templatePath(templateFile));
	let compiledTemplate = Handlebars.compile(template);
	let output = compiledTemplate(data);
	_this.fs.write(_this.destinationPath(destinationFile), output);
}

function _copyFiles(_this, srcPath, dstPath, templateContext) {

	let files = Glob.sync(srcPath + "/**/*", {dot: true});

	_.each(files, function (srcFilePath) {

		// Do not process srcFilePath if it is pointing to a directory
		if (fs.lstatSync(srcFilePath).isDirectory()) return;

		// Do not process files that end in .partial, they're processed separately
		if (srcFilePath.indexOf(".partial") > 0 || srcFilePath.indexOf(".replacement") > 0) return;

		let functionName =srcFilePath.substring(srcFilePath.lastIndexOf("/")+1);
		if( _.isUndefined(functionName) ) {
			return;
		}

		// Lets write the Actions using HandleBars
		_writeHandlebarsFile(_this,srcFilePath, dstPath+"/"+functionName,templateContext);

	}.bind(this));
}


const sanitizeAlphaNumDash = (name) => {
	name = name || 'appname';
	return name
    .toLowerCase()
    .replace(REGEX_LEADING_ALPHA, '')
    .replace(/ /g, '-')
    .replace(REGEX_ALPHA_NUM_DASH, '');
};

function mergeFileObject(existingObject, objectToMerge){
	let existingFiles = [];
	let existingData = {};
	existingObject.forEach((obj) => {
		existingFiles.push(obj.filepath);
		existingData[obj.filepath] = obj.data;
	})
	objectToMerge.forEach((obj) => {
		if(existingFiles.includes(obj.filepath)) {
			obj.data.forEach((data) => {
				if(existingData[obj.filepath].includes(data)) {
					return; //The data is already being written in this file
				} else {
					existingData[obj.filepath].push(data);
				}
			})
		} else {
			existingObject.push(obj);
		}
	})
}

function addJavaDependencies() {
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

module.exports = {
	sanitizeAlphaNum: sanitizeAlphaNum,
	sanitizeAlphaNumLowerCase: sanitizeAlphaNumLowerCase,
	sanitizeAlphaNumDash: sanitizeAlphaNumDash,
	writeHandlebarsFile: _writeHandlebarsFile,
	copyFiles: _copyFiles,
	PATH_KNATIVE_YAML: PATH_KNATIVE_YAML,
	mergeFileObject: mergeFileObject,
	addJavaDependencies: addJavaDependencies
};
