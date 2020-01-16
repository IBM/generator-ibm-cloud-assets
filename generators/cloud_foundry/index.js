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

'use strict';

const Handlebars = require('../lib/handlebars.js');
const Generator = require('yeoman-generator');
const _ = require('lodash');
const Utils = require('../lib/utils');
const xmljs = require('xml-js');
const jsyaml = require('js-yaml');
const fs = require('fs');

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);

		//TODO: what is cloudContext do we still need this or was it from the lang gens
		if (opts.cloudContext) {
			this.opts = opts.cloudContext
			this.opts.libertyVersion = opts.libertyVersion
		} else {
			this.opts = opts
		}
		//TODO: trash bluemiox completely
		if (typeof(opts.bluemix) === 'string') {
			this.bluemix = JSON.parse(opts.bluemix || '{}');
		} else if (typeof(opts.bluemix) === 'object') {
			this.bluemix = opts.bluemix;
		}

	}

	configuring() {
		this.manifestConfig = {};
		this.manifestConfig.env = {};
		this.toolchainConfig = {};
		this.pipelineConfig = {
			buildJobProps: {
				artifact_dir: "''"
			},
			triggersType: 'commit'
		};
		this.deployment = {
			type: 'CF',
			name: this.opts.application.name,
			language: this.opts.application.language
		};

		this.name = undefined;
		this.manifestConfig.name = this.opts.application.sanitizedName
		if (this.opts.deploy_options.cloud_foundry) {
			this.name = this.opts.application.name;
			this.manifestConfig = Object.assign(this.manifestConfig, this.opts.deploy_options.cloud_foundry);
			// use service instance names in manifest
			this.manifestConfig.services = {};
			_.forEach(this.opts.deploy_options.cloud_foundry.service_bindings, (service, serviceKey) => {
				this.manifestConfig.services[serviceKey] = service["name"];
			});
			this.deployment = Object.assign(this.deployment, this.opts.deploy_options.cloud_foundry.cloudDeploymentOptions);
			this.manifestConfig.instances = this.manifestConfig.instances || '1';
			this.deployment.type = 'CF'
			this.deployment.hasMongo = this.opts.createType === 'mern' || this.opts.createType === 'mean';
		} else {
			this.name = this.opts.application.name;
			this.deployment.type = 'CF';
		}

		switch (this.opts.application.language) {
			case 'NODE':
				this._configureNode();
				break;
			case 'SWIFT':
				this._configureSwift();
				break;
			case 'JAVA':
				this._configureJavaCommon();
				this._configureLiberty();
				break;
			case 'SPRING':
				this._configureJavaCommon();
				this._configureSpring();
				break;
			case 'PYTHON':
				this._configurePython();
				break;
			case 'DJANGO':
				this._configureDjango();
				break;
			case 'GO':
				this._configureGo();
				break;
			default:
				throw new Error(`Language ${this.opts.application.language} was not one of the valid languages: NODE, SWIFT, JAVA, SPRING, DJANGO, PYTHON, or GO`);
		}
		if (this.manifestConfig && this.manifestConfig.ignorePaths) {
			this.cfIgnoreContent = this.cfIgnoreContent.concat(this.manifestConfig.ignorePaths);
		}

	}

	/***
	 * Get the highest memory size available
	 *
	 * @params manifestMemoryConfig {string} the memory allocated h
	 */
	_getHighestMemorySize(manifestMemoryConfig, userDefinedMinMemory) {
		if (!userDefinedMinMemory) {
			return manifestMemoryConfig;
		} else if (!manifestMemoryConfig && userDefinedMinMemory) {
			return userDefinedMinMemory;
		}

		const memMap = {
			k: 1,
			m: 2,
			g: 3
		};
		const manifestSize = manifestMemoryConfig.replace(/[^MmGgKk]/g, '');
		const userDefinedMinSize = userDefinedMinMemory.replace(/[^MmGgKk]/g, '');
		let highestAvailableSize;

		if (memMap[manifestSize.toLowerCase()] > memMap[userDefinedMinSize.toLowerCase()]) {
			highestAvailableSize = manifestMemoryConfig;
		} else if (memMap[manifestSize.toLowerCase()] < memMap[userDefinedMinSize.toLowerCase()]) {
			highestAvailableSize = userDefinedMinMemory;
		} else {
			const manifestValue = parseInt(manifestSize.replace(/[M,m,G,g,K,k]/g, ''));
			const definedValue = parseInt(userDefinedMinSize.replace(/[M,m,G,g,K,k]/g, ''));

			highestAvailableSize = manifestValue > definedValue ? manifestMemoryConfig : userDefinedMinMemory;
		}

		return highestAvailableSize;
	}

	_configureNode() {

		if (this.fs.exists(this.destinationPath("webpack.js")) || this.fs.exists(this.destinationPath("webpack.prod.js"))) {
			this.manifestConfig.command = 'NODE_ENV=production npm start';
			this.manifestConfig.env.NPM_CONFIG_PRODUCTION = false;
		} else {
			this.manifestConfig.command = 'npm start';
		}

		this.manifestConfig.buildpack = 'sdk-for-nodejs';
		this.manifestConfig.memory = this._getHighestMemorySize(this.manifestConfig.memory, this.opts.nodeCFMinMemory);
		this.cfIgnoreContent = ['.git/', 'node_modules/', 'test/', 'vcap-local.js'];
	}

	_configureGo() {
		this.manifestConfig.buildpack = 'go_buildpack';
		this.manifestConfig.command = undefined;
		this.manifestConfig.memory = this.manifestConfig.memory || '128M';
		this.manifestConfig.env.GOPACKAGENAME = this.opts.application.sanitizedName;
		try {
			// pattern type skits need a static GOPACKAGE name specified in static manifest for server.go imports
			let manifestyml = jsyaml.safeLoad(fs.readFileSync('manifest.yml', 'utf8'));
			if (manifestyml.applications[0].env.GOPACKAGENAME) {
				this.manifestConfig.env.GOPACKAGENAME = manifestyml.applications[0].env.GOPACKAGENAME
			}
		} catch (err) {
			// cannot read file or find a command, return to default behavior
		}

		this.cfIgnoreContent = ['.git/', 'vendor/'];
	}

	_configureSwift() {
		this.manifestConfig.buildpack = 'swift_buildpack';

		// if there is a `command` in manifest.yml already, keep it. Otherwise, this is the default command string:
		let manifestCommand = this.opts.application.name ? ("\'" + `${this.opts.application.name}` + "\'") : undefined;
		try {
			let manifestyml = jsyaml.safeLoad(fs.readFileSync('manifest.yml', 'utf8'));
			manifestCommand = manifestyml.applications[0].command ? manifestyml.applications[0].command : manifestCommand;
		} catch (err) {
			// cannot read file or find a command, return to default behavior
		}
		this.manifestConfig.command = manifestCommand;
		this.manifestConfig.env.SWIFT_BUILD_DIR_CACHE = false;
		this.manifestConfig.memory = this.manifestConfig.memory || '128M';
		this.cfIgnoreContent = ['.build/*', '.build-ubuntu/*', 'Packages/*'];
	}

	_configureJavaCommon() {
		if (this.opts.appName) {
			this.manifestConfig.name = this.opts.appName;
			this.name = this.opts.appName;
		}
		if (!this.opts.artifactId) {
			try {
				const data = this.fs.read(this.destinationPath("pom.xml"));
				const pomJson = xmljs.xml2json(data, {
					compact: true,
					spaces: 4
				})
				const pom = JSON.parse(pomJson);
				this.opts.artifactId = pom.project.artifactId._text;
			} catch (err) {
				// file not found
				this.opts.artifactId = "<replace-me-with-artifactId-from-pom.xml>";
			}
		}
		if (this.opts.createType === 'bff/liberty') {
			this.manifestConfig.env.OPENAPI_SPEC = `/${this.name}/swagger/api`;
		}
		if (this.opts.createType === 'bff/spring') {
			this.manifestConfig.env.OPENAPI_SPEC = '/swagger/api';
		}
	}

	_configureLiberty() {
		let version = this.opts.version ? this.opts.version : "1.0-SNAPSHOT";
		this.cfIgnoreContent = ['/.classpath', '/.project', '/.settings', '/src/main/liberty/config/server.env', 'target/', 'build/'];
		this.manifestConfig.buildpack = 'liberty-for-java';
		this.manifestConfig.memory = this.manifestConfig.memory || '512M';
		let buildDir = (this.opts.buildType && this.opts.buildType === 'gradle') ? 'build' : 'target';
		let zipPath = `${buildDir}/${this.opts.artifactId}` + `-` + version + `.zip`;
		this.manifestConfig.path = `./${zipPath}`;
		let excludes = [];
		if (this.opts.libertyVersion === 'beta') {
			this.manifestConfig.env.IBM_LIBERTY_BETA = 'true'
			this.manifestConfig.env.JBP_CONFIG_LIBERTY = '\"version: +\"'
		}
		if (this.bluemix.cloudant) {
			excludes.push('cloudantNoSQLDB=config');
		}
		if (this.bluemix.objectStorage) {
			excludes.push('Object-Storage=config');
		}
		if (excludes.length === 1) {
			this.manifestConfig.env.services_autoconfig_excludes = excludes[0];
		}
		if (excludes.length === 2) {
			this.manifestConfig.env.services_autoconfig_excludes = excludes[0] + ' ' + excludes[1];
		}
	}

	_configureSpring() {
		let version = this.opts.version ? this.opts.version : "1.0-SNAPSHOT";
		this.cfIgnoreContent = ['/.classpath', '/.project', '/.settings', '/src/main/resources/application-local.properties', 'target/', 'build/'];
		this.manifestConfig.buildpack = 'java_buildpack';
		this.manifestConfig.memory = this._getHighestMemorySize(this.manifestConfig.memory, '1024M');
		let buildDir = (this.opts.buildType && this.opts.buildType === 'gradle') ? 'build/libs' : 'target';
		let jarPath = `${buildDir}/${this.opts.artifactId}` + `-` + version + `.jar`;
		this.manifestConfig.path = `./${jarPath}`;
		this.pipelineConfig.pushCommand = 'cf push "${CF_APP}" -p ' + jarPath + ' --hostname "${CF_HOSTNAME}" -d "${CF_DOMAIN}"';
	}

	_configurePython() {
		this.manifestConfig.buildpack = 'python_buildpack';
		this.manifestConfig.command = this.opts.enable ?
			'echo No run command specified in manifest.yml' :
			'python manage.py start 0.0.0.0:$PORT';
		this.manifestConfig.memory = this.manifestConfig.memory || '128M';
		this.manifestConfig.env.FLASK_APP = 'server';
		this.manifestConfig.env.FLASK_DEBUG = 'false';
		this.cfIgnoreContent = ['.pyc', '.egg-info'];
	}

	_configureDjango() {
		this.manifestConfig.buildpack = 'python_buildpack';

		// if there is a `command` in manifest.yml already, keep it. Otherwise, this is the default command string:
		let manifestCommand = `gunicorn --env DJANGO_SETTINGS_MODULE=${this.opts.application.name}.settings.production ${this.opts.application.name}.wsgi -b 0.0.0.0:$PORT`;
		try {
			let manifestyml = jsyaml.safeLoad(fs.readFileSync('manifest.yml', 'utf8'));
			manifestCommand = manifestyml.applications[0].command ? manifestyml.applications[0].command : manifestCommand;
		} catch (err) {
			// cannot read file or find a command, return to default behavior
		}
		this.manifestConfig.command = this.opts.enable ? 'echo No run command specified in manifest.yml' : manifestCommand;
		this.manifestConfig.memory = this.manifestConfig.memory || '128M';
		this.cfIgnoreContent = ['.pyc', '.egg-info'];
	}

	cleanUpPass() {
		if (this.manifestConfig && this.manifestConfig.env && Object.keys(this.manifestConfig.env).length < 1) {
			delete this.manifestConfig.env;
		}
		if (this.cfIgnoreContent) {
			this.cfIgnoreContent = this.cfIgnoreContent.join('\n');
		}
	}

	writing() {
		//skip writing files if platforms is specified via options and it doesn't include bluemix
		//TODO: this.opts.platforms?
		if (this.opts.platforms && !this.opts.platforms.includes('bluemix')) {
			return;
		}
		// write manifest.yml file
		this.manifestConfig.hasServices = false;
		if (this.manifestConfig.services && !_.isEmpty(this.manifestConfig.services) ) {
			this.manifestConfig.hasServices = true;
		}
		this._writeHandlebarsFile('manifest_master.yml', 'manifest.yml', this.manifestConfig)

		// if cfIgnnoreContent exists, create/write .cfignore file
		if (this.cfIgnoreContent) {
			this.fs.write('.cfignore', this.cfIgnoreContent);
		}
	}

	_writeHandlebarsFile(templateFile, destinationFile, data) {
		let template = this.fs.read(this.templatePath(templateFile));
		let compiledTemplate = Handlebars.compile(template);
		let output = compiledTemplate(data);
		this.fs.write(this.destinationPath(destinationFile), output);
	}
};
