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

const Generator = require('yeoman-generator');
let _ = require('lodash');
const Handlebars = require('../lib/handlebars.js');
const Utils = require('../lib/utils');

module.exports = class extends Generator {

	constructor(args, opts) {
		super(args, opts);

		if (typeof (opts.bluemix) === 'string') {
			this.bluemix = JSON.parse(opts.bluemix || '{}');
		} else {
			this.bluemix = opts.bluemix;
		}

		if(typeof (opts) === 'string'){
			this.opts = JSON.parse(opts || '{}');
		} else {
			this.opts = opts.cloudContext || opts;
		}
	}


	initializing() {
		this.fileLocations = {
			chart: {source : 'Chart.yaml', target : 'chartDir/Chart.yaml', process: true},
			deployment: {source : 'deployment.yaml', target : 'chartDir/templates/deployment.yaml', process: true},
			service: {source : 'service.yaml', target : 'chartDir/templates/service.yaml', process: false},
			hpa: {source : 'hpa.yaml', target : 'chartDir/templates/hpa.yaml', process: true},
			istio: {source : 'istio.yaml', target : 'chartDir/templates/istio.yaml', process: true},
			basedeployment: {source : 'basedeployment.yaml', target : 'chartDir/templates/basedeployment.yaml', process: true},
			values: {source : 'values.yaml', target : 'chartDir/values.yaml', process: true}
		};
	}

	configuring() {
		this.opts.chartName = this.options.application.chartName
		
		// not services like cloudant, services like mongo
		this.opts.services = typeof(this.opts.services) === 'string' ? JSON.parse(this.opts.services || '[]') : this.opts.services;
	}

	writing() {
		// setup output directory name for helm chart
		// chart/<applicationName>/...
		let chartDir = 'chart/' + this.opts.chartName;

		if (this.opts.application.language.toLowerCase() === 'java' || this.opts.application.language.toLowerCase() === 'spring') {
			this.fileLocations.deployment.source = 'java/deployment.yaml';
			this.fileLocations.basedeployment.source = 'java/basedeployment.yaml';
			this.fileLocations.service.source = 'java/service.yaml';
			this.fileLocations.service.process = true;
			this.fileLocations.values.source = 'java/values.yaml';
		}

		// iterate over file names
		let files = Object.keys(this.fileLocations);
		files.forEach(file => {
			let source = this.fileLocations[file].source;
			let target = this.fileLocations[file].target;
			if(target.startsWith('chartDir')) {
				target = chartDir + target.slice('chartDir'.length);
			}
			if(this.fileLocations[file].process) {
				this._writeHandlebarsFile(source, target, this.opts);
			} else {
				this.fs.copy(
					this.templatePath(source),
					this.destinationPath(target)
				);
			}
		});
	}

	_writeHandlebarsFile(templateFile, destinationFile, data) {
		let template = this.fs.read(this.templatePath(templateFile));
		let compiledTemplate = Handlebars.compile(template);
		let output = compiledTemplate(data);
		this.fs.write(this.destinationPath(destinationFile), output);
	}
};
