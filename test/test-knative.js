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
const utils = require('./test-utils');
const path = require('path');
const yml = require('js-yaml');
const fs = require('fs');
const _ = require('lodash');

let knativeOptions = utils.generateTestPayload("knative", "NODE", ['appid', 'cloudant']);

describe('cloud-assets:knative', function () {
	this.timeout(5000);
	const lang = 'NODE';

	before(function () {
		return helpers.run(path.join(__dirname, '../generators/app'))
			.inDir(path.join(__dirname, './tmp'))
			.withOptions(knativeOptions);
	});

	it('has service.yaml', function () {
		assert.file('./service.yaml');
	});

	it('has correct service.yaml contents', function () {
		let serviceYamlFilePath = './service.yaml';
		const targetServiceYaml = {
			"apiVersion": "serving.knative.dev/v1alpha1",
			"kind": "Service",
			"metadata": {
			  "name": knativeOptions.application.chartName
			},
			"spec": {
			  "template": {
				"spec": {
				  "containers": [
					{
					  "image": "REGISTRY_URL/REGISTRY_NAMESPACE/IMAGE_NAME:BUILD_NUMBER",
					  "ports": [
						{
						  "containerPort": 3000
						}
					  ],
					  "env": [
						{
						  "name": "service_appid",
						  "valueFrom": {
							"secretKeyRef": {
							  "name": "my-service-appid",
							  "key": "binding"
							}
						  }
						},
						{
						  "name": "service_cloudant",
						  "valueFrom": {
							"secretKeyRef": {
							  "name": "my-service-cloudant",
							  "key": "binding"
							}
						  }
						}
					  ]
					}
				  ]
				}
			  }
			}
		  }

		let generatedYamlContents = yml.safeLoad(fs.readFileSync(serviceYamlFilePath, 'utf8'));
		assert(_.isEqual(generatedYamlContents, targetServiceYaml), "\n" + JSON.stringify(generatedYamlContents) + "\n" + JSON.stringify(targetServiceYaml) );
	});

	it('does not have helm charts', function () {

		assert.noFile('./chart')
	});

});
