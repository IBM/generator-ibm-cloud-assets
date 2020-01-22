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

const Generator = require('yeoman-generator');
const Handlebars = require('../lib/handlebars.js');

module.exports = class extends Generator {

	constructor(args, opts) {
		super(args, opts);
		this.opts = opts;
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

	writing() {
		// setup output directory name for helm chart as chart/<applicationName>/...
		let chartDir = 'chart/' + this.opts.application.chartName;

		if (this.opts.application.language.toLowerCase() === 'java' || this.opts.application.language.toLowerCase() === 'spring') {
			this.fileLocations.deployment.source = 'java/deployment.yaml';
			this.fileLocations.basedeployment.source = 'java/basedeployment.yaml';
			this.fileLocations.service.source = 'java/service.yaml';
			this.fileLocations.service.process = true;
			this.fileLocations.values.source = 'java/values.yaml';
		}

		// iterate over file names for processing
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
