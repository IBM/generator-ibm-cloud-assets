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
const logger = Log4js.getLogger('generator-ibm-cloud-assets:kn');
const Generator = require('yeoman-generator');
const Handlebars = require('../lib/handlebars');

module.exports = class extends Generator {

	constructor(args, opts) {
		super(args, opts);
		this.opts = opts
	}

	initializing() {}

	writing() {
		let template = this.fs.read(this.templatePath('service.yaml'));
		let compiledTemplate = Handlebars.compile(template);
		let output = compiledTemplate(this.options);

		logger.trace( `Generating service.yaml for ${this.opts.application.sanitizedName.toLowerCase()} with port ${this.opts.deploy_options.servicePorts.http}` )
		this.fs.write(this.destinationPath('./service.yaml'), output);
	}
};
