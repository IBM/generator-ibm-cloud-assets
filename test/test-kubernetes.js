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

/* eslint-env mocha */

'use strict';

const helpers = require('yeoman-test');
const assert = require('yeoman-assert');
const path = require('path');
const fs = require('fs');
const yml = require('js-yaml');
const exec = require('child_process').exec;
const _ = require('lodash');
const utils = require('./test-utils');

function testOutput(applicationName, chartLocation) {

	it('has kubernetes config for Chart.yaml', function () {
		let chartFile = chartLocation + '/Chart.yaml';
		assert.file(chartFile);
		let chartyml = yml.safeLoad(fs.readFileSync(chartFile, 'utf8'));
		assertYmlContent(chartyml.name, applicationName.toLowerCase(), 'chartyml.name');
	});

	it('has kubernetes config for values.yaml', function () {
		let valuesFile = chartLocation + '/values.yaml';
		assert.file(valuesFile);
	});

	it('has kubernetes config for deployment', function () {
		assert.file(chartLocation + '/templates/deployment.yaml');
	});

	it('has kubernetes config for service', function () {
		assert.file(chartLocation + '/templates/service.yaml');
	});

	it('has kubernetes config for HPA', function () {
		assert.file(chartLocation + '/templates/hpa.yaml');
	});
	assertHpaYmlContent(chartLocation);

	it('has kubernetes config for basedeployment', function () {
		assert.file(chartLocation + '/templates/basedeployment.yaml');
	});

	it('has valid helm chart when running helm lint', function (done) {
		exec('helm lint ' + chartLocation + '/', {maxBuffer: 20 * 1024 * 1024}, (error, stdout) => {
			error ? done(new Error(stdout)) : done();
		})
	});

	it('renders a valid chart using helm template', function (done) {
		exec('helm template ' + chartLocation + '/', {maxBuffer: 20 * 1024 * 1024}, (error, stdout) => {
			// Uncomment to view locally rendered helm charts
			// console.log(stdout);
			if ( error ) {
				done(new Error(stdout))
			} else {
				// template command will render two charts: service and Deployment
				let charts = yml.safeLoadAll(stdout);
				assertYmlContent(charts[1].kind, 'Deployment', 'charts[1].kind');
				done();
			}
		})
	});
}

function assertYmlContent(actual, expected, label) {
	assert.strictEqual(actual, expected, 'Expected ' + label + ' to be ' + expected + ', found ' + actual);
}

function assertYmlContentExists(actual, label) {
	assert.notStrictEqual(actual, undefined, 'Expected ' + label + ' to be defined, it was not');
}

// We rely on running helm lint to ensure the charts are valid.
// Here, we're commenting out the block processing that helm would
// perform so that we can evaluate content as tho it were normal yaml
function getSafeYaml(fileName) {
	const rawyml = fs.readFileSync(fileName, 'utf8');

	const newyml = rawyml.replace('"+" "_"', '\\"+\\" \\"_\\"')
		.replace(/^{{(-? if)/gm, '#$1')
		.replace(/^{{ else/gm,  '# else')
		.replace(/^{{(-? end)/gm, '#$1')
		.replace(/{{.Files/, '#.Files');

	return  yml.safeLoad(newyml);
}

function assertHpaYmlContent(chartLocation) {
	it('has templates/hpa.yaml file with correct contents', function () {
		assert.fileContent(chartLocation + '/templates/hpa.yaml', '{{ if .Values.hpa.enabled }}');
		assert.fileContent(chartLocation + '/templates/hpa.yaml', '{{ if and (eq .Capabilities.KubeVersion.Major "1") (ge .Capabilities.KubeVersion.Minor "8") }}');
		assert.fileContent(chartLocation + '/templates/hpa.yaml', 'apiVersion: autoscaling/v2beta1\n{{ else }}\napiVersion: autoscaling/v2alpha1\n{{ end }}');
		assert.fileContent(chartLocation + '/templates/hpa.yaml', 'name: "{{ .Chart.Name }}-hpa-policy"');
		assert.fileContent(chartLocation + '/templates/hpa.yaml', 'minReplicas: {{ .Values.hpa.minReplicas }}');
		assert.fileContent(chartLocation + '/templates/hpa.yaml', 'maxReplicas: {{ .Values.hpa.maxReplicas }}');
		assert.fileContent(chartLocation + '/templates/hpa.yaml', 'targetAverageUtilization: {{ .Values.hpa.metrics.cpu.targetAverageUtilization }}');
		assert.fileContent(chartLocation + '/templates/hpa.yaml', 'targetAverageUtilization: {{ .Values.hpa.metrics.memory.targetAverageUtilization }}');
	});
}

describe('cloud-assets:kubernetes', function () {
	this.timeout(5000);

	let languages = [ 'JAVA', 'SPRING', 'NODE', 'GO', 'SWIFT', 'PYTHON' ];
	
	languages.forEach(language => {
		describe('kubernetes:app with ' + language + ' project', function () {
			beforeEach(function () {
				return helpers.run(path.join(__dirname, '../generators/app'))
					.inDir(path.join(__dirname, './tmp'))
					.withOptions(utils.generateTestPayload("helm", language, ['appid', 'cloudant']));
			});

			let applicationName = `testgenv2apphelm${language}`;
			let chartLocation = 'chart/' + applicationName.toLowerCase();
		
			testOutput(applicationName, chartLocation);
			it('has deployment.yaml with readiness probe in liberty & spring', function () {
				let deploymentyml = getSafeYaml(chartLocation + '/templates/deployment.yaml');
				let readinessProbe = deploymentyml.spec.template.spec.containers[0].readinessProbe;
				if (language === 'JAVA') {
					assertYmlContent(readinessProbe.httpGet.path, '/health', 'readinessProbe.httpGet.path');
					assertYmlContent(readinessProbe.httpGet.port, 9080, 'readinessProbe.httpGet.port');
				}
				if (language === 'SPRING') {
					assertYmlContent(readinessProbe.httpGet.path, '/health', 'readinessProbe.httpGet.path');
					assertYmlContent(readinessProbe.httpGet.port, 8080, 'readinessProbe.httpGet.port');
				}
			});

			it('has deployment.yaml with correct hpa settings', () => {
				let deploymentyml = getSafeYaml(chartLocation + '/templates/deployment.yaml');
				let resources = deploymentyml.spec.template.spec.containers[0].resources;
				assertYmlContentExists(resources.requests.cpu, 'resources.requests.cpu');
				assertYmlContentExists(resources.requests.memory, 'resources.requests.memory');
			});

			it('has deployment.yaml with correct env settings', () => {
				let deploymentyml = getSafeYaml(chartLocation + '/templates/deployment.yaml');
				let envTemplate;
				if (language === 'NODE' || language === 'PYTHON' || language === 'SWIFT') {
					// these languages support app_id, other languages do not
					envTemplate = [{"name":"service_appid","valueFrom":{"secretKeyRef":{"name":{"[object Object]":null},"key":"binding","optional":true}}},{"name":"service_cloudant","valueFrom":{"secretKeyRef":{"name":{"[object Object]":null},"key":"binding","optional":true}}},{"name":"PORT","value":"{{ .Values.service.servicePort }}"},{"name":"APPLICATION_NAME","value":"{{ .Release.Name }}"}]
				} else {
					envTemplate = [{"name":"service_cloudant","valueFrom":{"secretKeyRef":{"name":{"[object Object]":null},"key":"binding","optional":true}}},{"name":"PORT","value":"{{ .Values.service.servicePort }}"},{"name":"APPLICATION_NAME","value":"{{ .Release.Name }}"}]
				}
				assert( _.isEqual(deploymentyml.spec.template.spec.containers[0].env, envTemplate) )
			});

			it('has service.yaml with correct content', function () {
				let serviceyml = getSafeYaml(chartLocation + '/templates/service.yaml');
				console.log(chartLocation + " service.yml")
				console.log(JSON.stringify(serviceyml))

				if (language === 'JAVA') {
					assertYmlContent(serviceyml.spec.ports[0].name, 'https', 'serviceyml.spec.ports[0].name');
					assertYmlContent(serviceyml.spec.ports[1].name, 'http', 'serviceyml.spec.ports[1].name');
				}
				if (language === 'SPRING') {
					assertYmlContent(serviceyml.spec.ports[0].name, 'http', 'serviceyml.spec.ports[0].name');
					assertYmlContent(serviceyml.spec.ports[1], undefined, 'serviceyml.spec.ports[1]');
				}
				if (language === 'NODE' || language === 'GO') {
					assertYmlContent(serviceyml.spec.ports[0].name, 'http', 'serviceyml.spec.ports[0].name');
				}
			});

			it('has values.yaml with correct content', function () {
				let valuesyml = getSafeYaml(chartLocation + '/values.yaml');
				let templateValuesYml;
				if (language === 'JAVA') {
					templateValuesYml = {"replicaCount":1,"revisionHistoryLimit":1,"image":{"repository":"testgenv2apphelmjava","tag":"v1.0.0","pullPolicy":"IfNotPresent","resources":{"requests":{"cpu":"200m","memory":"300Mi"}}},"service":{"name":"Node","type":"NodePort","servicePort":9080,"servicePortHttps":9443},"hpa":{"enabled":false,"minReplicas":1,"maxReplicas":2,"metrics":{"cpu":{"targetAverageUtilization":70},"memory":{"targetAverageUtilization":70}}},"base":{"enabled":false,"replicaCount":1,"image":{"tag":"v0.9.9"},"weight":100},"istio":{"enabled":false,"weight":100},"services":{"cloudant":{"secretKeyRef":"my-service-cloudant"}}}
					assert( _.isEqual(templateValuesYml, valuesyml) )
				} else if (language === 'SPRING') {
					templateValuesYml = {"replicaCount":1,"revisionHistoryLimit":1,"image":{"repository":"testgenv2apphelmspring","tag":"v1.0.0","pullPolicy":"IfNotPresent","resources":{"requests":{"cpu":"200m","memory":"300Mi"}}},"service":{"name":"Node","type":"NodePort","servicePort":8080},"hpa":{"enabled":false,"minReplicas":1,"maxReplicas":2,"metrics":{"cpu":{"targetAverageUtilization":70},"memory":{"targetAverageUtilization":70}}},"base":{"enabled":false,"replicaCount":1,"image":{"tag":"v0.9.9"},"weight":100},"istio":{"enabled":false,"weight":100},"services":{"cloudant":{"secretKeyRef":"my-service-cloudant"}}}
					assert( _.isEqual(templateValuesYml, valuesyml) )
				} else if (language === 'NODE') {
					templateValuesYml = {"replicaCount":1,"revisionHistoryLimit":1,"image":{"tag":"v1.0.0","pullPolicy":"Always","resources":{"requests":{"cpu":"200m","memory":"300Mi"}}},"livenessProbe":{"initialDelaySeconds":30,"periodSeconds":10},"service":{"name":"node","type":"NodePort","servicePort":3000},"hpa":{"enabled":false,"minReplicas":1,"maxReplicas":2,"metrics":{"cpu":{"targetAverageUtilization":70},"memory":{"targetAverageUtilization":70}}},"base":{"enabled":false,"replicaCount":1,"image":{"tag":"v0.9.9"},"weight":100},"istio":{"enabled":false,"weight":100},"services":{"appid":{"secretKeyRef":"my-service-appid"},"cloudant":{"secretKeyRef":"my-service-cloudant"}}}
					assert( _.isEqual(templateValuesYml, valuesyml) )
				}
			});

			it('has basedeployment.yaml with correct content', function () {
				let basedeploymentyml = getSafeYaml(chartLocation + '/templates/basedeployment.yaml');

				console.log(chartLocation + " basedeployment.yml")
				console.log(JSON.stringify(basedeploymentyml))

				assert.fileContent(chartLocation + '/templates/basedeployment.yaml', 'replicas: {{ .Values.base.replicaCount }}');

				assertYmlContent(basedeploymentyml.metadata.name, '{{  .Chart.Name }}-basedeployment', 'basedeploymentyml.metadata.name');
				assertYmlContent(basedeploymentyml.spec.template.spec.containers[0].image, '{{ .Values.image.repository }}:{{ .Values.base.image.tag }}',
					'basedeploymentyml.spec.template.spec.containers.image');
				assertYmlContent(basedeploymentyml.spec.template.metadata.labels.version, 'base', 'basedeploymentyml.spec.template.metadata.labels.version');
			});
		});
	});
	

	describe('kubernetes:app with Java-liberty ', function () {

		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(utils.generateTestPayload("helm", "JAVA", ['appid', 'cloudant']))
		});

		  

		it('should not have kubernetes files', function () {
			let applicationName = `testgenv2apphelmjava`;
			let chartLocation = 'chart/' + applicationName.toLowerCase();
	
			fs.readdir("./chart/testgenv2apphelmjava/templates", (err, files) => {
				files.forEach(file => {
				  console.log(file);
				});
			  });
	
			assert.file(chartLocation + '/templates/service.yaml');
			assert.file(chartLocation + '/templates/deployment.yaml');
			assert.file(chartLocation + '/templates/hpa.yaml');
			assert.file(chartLocation + '/templates/istio.yaml');
			assert.file(chartLocation + '/values.yaml');
			assert.file(chartLocation + '/Chart.yaml');
		});
	});

	describe('kubernetes:app with Node ', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(utils.generateTestPayload("helm", "NODE", ['appid', 'cloudant']));
		});
		let applicationName = `testgenv2apphelmnode`;
		let chartLocation = 'chart/' + applicationName.toLowerCase();

		testOutput(applicationName, chartLocation);
	});

	describe('kubernetes:app with Swift ', function () {
		beforeEach(function () {
			return helpers.run(path.join(__dirname, '../generators/app'))
				.inDir(path.join(__dirname, './tmp'))
				.withOptions(utils.generateTestPayload("helm", "SWIFT", ['appid', 'cloudant']))
		});
		let applicationName = `testgenv2apphelmswift`;
		let chartLocation = 'chart/' + applicationName.toLowerCase();

		testOutput(applicationName, chartLocation);
	});

});
