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

const Log4js = require('log4js');
const logger = Log4js.getLogger('generator-ibm-cloud-assets:cf');
const Handlebars = require('../lib/handlebars.js');
const Generator = require('yeoman-generator');
const _ = require('lodash');
const xmljs = require('xml-js');
const jsyaml = require('js-yaml');
const fs = require('fs');

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.opts = opts;
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

		this.manifestConfig.name = this.opts.application.sanitizedName
		this.name = this.opts.application.name;
		//TODO: check on memory syntax in this.manifestConfig
		this.manifestConfig = Object.assign(this.manifestConfig, this.opts.deploy_options.cloud_foundry);
		// use service instance names in manifest
		this.manifestConfig.services = {};
		_.forEach(this.opts.deploy_options.cloud_foundry.service_bindings, (service, serviceKey) => {
			this.manifestConfig.services[serviceKey] = service["name"];
		});
		this.manifestConfig.instances = this.manifestConfig.instances || '1';

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

		let baseCfIgnoreContent = ['Dockerfile', 'Dockerfile-tools', '.dockerignore', '.git/', '.github/', '.gitignore']
		if (this.cfIgnoreContent) {
			this.cfIgnoreContent = this.cfIgnoreContent.concat(baseCfIgnoreContent);
		} else {
			this.cfIgnoreContent = baseCfIgnoreContent
		}

	}

	/***
	 * Get the highest memory size available
	 *
	 * @params manifestMemoryConfig {string} the memory allocated h
	 */
	_getHighestMemorySize(manifestMemoryConfig, minNecessaryMemory) {
		if (!minNecessaryMemory) {
			return manifestMemoryConfig;
		} else if (!manifestMemoryConfig && minNecessaryMemory) {
			return minNecessaryMemory;
		}

		const bytesMap = {
			k: 1024,
			m: 1048576,
			g: 1073741824, 
			K: 1024, 
			M: 1048576, 
			G: 1073741824
		};
		const manifestValue = parseInt(manifestMemoryConfig.replace(/[M,m,G,g,K,k]/g, ''));
		const definedValue = parseInt(minNecessaryMemory.replace(/[M,m,G,g,K,k]/g, ''));

		const manifestSize = bytesMap[manifestMemoryConfig.replace(/[^MmGgKk]/g, '')];
		const userDefinedMinSize = bytesMap[minNecessaryMemory.replace(/[^MmGgKk]/g, '')];

		let highestAvailableSize;
		if ((manifestValue*manifestSize) > (definedValue*userDefinedMinSize)) {
			highestAvailableSize = manifestMemoryConfig;
		} else {
			highestAvailableSize = minNecessaryMemory;
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
		this.manifestConfig.env.OPTIMIZE_MEMORY = true;
		this.manifestConfig.buildpack = 'sdk-for-nodejs';
		this.manifestConfig.memory = this._getHighestMemorySize(this.manifestConfig.memory, this.opts.nodeCFMinMemory);
		this.cfIgnoreContent = ['node_modules/', 'node_modules_linux', 'test/', 'vcap-local.js', '.npm/', '.npm-global/'];
	}

	_configureGo() {
		this.manifestConfig.buildpack = 'go_buildpack';
		this.manifestConfig.command = undefined;
		this.manifestConfig.memory = this.manifestConfig.memory || '64M';
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

		this.cfIgnoreContent = ['vendor/'];
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
		this.manifestConfig.memory = this.manifestConfig.memory || '64M';
		this.cfIgnoreContent = ['.build/*', '.build-ubuntu/*', 'Packages/*'];
	}

	_configureJavaCommon() {
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
	}

	_configureLiberty() {
		let version = this.opts.version ? this.opts.version : "1.0-SNAPSHOT";
		this.cfIgnoreContent = ['/.classpath', '/.project', '/.settings', '/src/main/liberty/config/server.env', 'target/', 'build/'];
		this.manifestConfig.buildpack = 'liberty-for-java';
		this.manifestConfig.memory = this._getHighestMemorySize(this.manifestConfig.memory,'256M');
		this.manifestConfig.env.JAVA_OPTS = '-XX:ReservedCodeCacheSize=16M -XX:MaxDirectMemorySize=16M';
		this.manifestConfig.env.JBP_CONFIG_OPEN_JDK_JRE = '[memory_calculator: {stack_threads: 20}]';

		let buildDir = 'target';
		let zipPath = `${buildDir}/${this.opts.artifactId}` + `-` + version + `.zip`;
		this.manifestConfig.path = `./${zipPath}`;
		let excludes = [];

		if (this.opts.application.service_credentials.cloudant) {
			excludes.push('cloudantNoSQLDB=config');
		}
		if (this.opts.application.service_credentials.objectStorage) {
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
		this.manifestConfig.memory = this._getHighestMemorySize(this.manifestConfig.memory, '256M');
		this.manifestConfig.env.JAVA_OPTS = '-XX:ReservedCodeCacheSize=32M -XX:MaxDirectMemorySize=32M';
		this.manifestConfig.env.JBP_CONFIG_OPEN_JDK_JRE = '[memory_calculator: {stack_threads: 30}]';
		let buildDir = 'target';
		let jarPath = `${buildDir}/${this.opts.artifactId}` + `-` + version + `.jar`;
		this.manifestConfig.path = `./${jarPath}`;
		this.pipelineConfig.pushCommand = 'cf push "${CF_APP}" -p ' + jarPath + ' --hostname "${CF_HOSTNAME}" -d "${CF_DOMAIN}"';
	}

	_configurePython() {
		this.manifestConfig.buildpack = 'python_buildpack';
		this.manifestConfig.command = this.opts.enable ?
			'echo No run command specified in manifest.yml' :
			'python manage.py start 0.0.0.0:$PORT';
		this.manifestConfig.memory = this.manifestConfig.memory || '64M'; 
		this.manifestConfig.env.FLASK_APP = 'server';
		this.manifestConfig.env.FLASK_DEBUG = 'false';
		this.cfIgnoreContent = ['.pyc', '.egg-info'];
	}

	_configureDjango() {
		this.manifestConfig.buildpack = 'python_buildpack';

		// if there is a `command` in manifest.yml already, keep it. Otherwise, this is the default command string:
		let manifestCommand = `gunicorn --env DJANGO_SETTINGS_MODULE=pythondjangoapp.settings.production pythondjangoapp.wsgi -b 0.0.0.0:$PORT`;
		try {
			let manifestyml = jsyaml.safeLoad(fs.readFileSync('manifest.yml', 'utf8'));
			manifestCommand = manifestyml.applications[0].command ? manifestyml.applications[0].command : manifestCommand;
		} catch (err) {
			// cannot read file or find a command, return to default behavior
		}
		//TODO: generalize manifestCommand for bx dev enable commands passed
		this.manifestConfig.command = this.opts.enable ? 'echo No run command specified in manifest.yml' : manifestCommand;
		this.manifestConfig.memory = this.manifestConfig.memory || '64 M';
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
		// write manifest.yml file
		this.manifestConfig.hasServices = false;
		if (this.manifestConfig.services && !_.isEmpty(this.manifestConfig.services) ) {
			this.manifestConfig.hasServices = true;
		}
		
		logger.trace( `Generating manifest.yml for ${this.opts.application.language} with manifestConfig: ${JSON.stringify(this.manifestConfig,null,3)}` )
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
