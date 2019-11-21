/*
 © Copyright IBM Corp. 2017, 2019
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

/* eslint-env mocha */
'use strict';

const helpers = require('yeoman-test');
const assert = require('yeoman-assert');
const path = require('path');
// const fs = require('fs');

const scaffolderSample = require('./samples/scaffolder-sample');
// const serviceYamlSample = fs.readFileSync(path.join(__dirname, 'samples/service-knative.yml'), 'utf-8');

describe('cloud-enablement:knative', function () {
	this.timeout(5000);
	const lang = 'NODE';
	let kubeOptions = {
		bluemix: JSON.stringify(scaffolderSample.getJsonServerWithDeployment(lang, 'Kube', 'KNATIVE'))
	};

	beforeEach(function () {
		return helpers.run(path.join(__dirname, '../generators/app'))
			.inDir(path.join(__dirname, './tmp'))
			.withOptions(kubeOptions);
	});

	it('has service.yml', function () {
		assert.file('./service-knative.yml');
	});
});
