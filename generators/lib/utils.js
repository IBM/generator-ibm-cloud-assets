/*
 © Copyright IBM Corp. 2019, 2020
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

'use strict';

const logger = require('log4js').getLogger("generator-ibm-cloud-assets:utils");
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const DOMParser = new JSDOM().window.DOMParser;
const XMLSerializer = require('xmlserializer');
const prettifyxml = require('prettify-xml');

const REGEX_LEADING_ALPHA = /^[^a-zA-Z]*/;
const REGEX_ALPHA_NUM = /[^a-zA-Z0-9]/g;

const PATH_KNATIVE_YAML = "./service.yaml";

const _sanitizeAlphaNumLowerCase = (name) => {
	let cleanName = '';
	if (name != undefined) {
		cleanName = name.replace(REGEX_LEADING_ALPHA, '').replace(REGEX_ALPHA_NUM, '').toLowerCase();
	}
	return (cleanName || 'APP');
};

const _portDefault = {
	java: {
		http: '9080',
		https: '9443'
	},
	spring: {
		http: '8080'
	},
	node: {
		http: '3000'
	},
	python: {
		http: '3000'
	},
	swift: {
		http: '8080'
	},
	django: {
		http: '3000'
	},
	go: {
		http: '8080'
	}
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
	sanitizeAlphaNumLowerCase: _sanitizeAlphaNumLowerCase,
	PATH_KNATIVE_YAML: PATH_KNATIVE_YAML,
	addJavaDependencies: addJavaDependencies,
	portDefault: _portDefault
};
