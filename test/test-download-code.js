/*
 © Copyright IBM Corp. 2020, 2020
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
const fs = require('fs');
const _ = require('lodash');

describe('cloud-assets:download-code', function () {
    this.timeout(1000*60*10);
    
    const serviceCombos = [[], ['appid'], ['cloudant'], ['appid', 'cloudant']];

    // create object and REMOVE DEPLOY_OPTIONS to mimic download code flow
    utils.LANGS.forEach(language => {
        serviceCombos.forEach(serviceCombo => { 
            describe(`cloud-assets:download-code with ${language} project`, function () {
                beforeEach(function () {
                    return helpers.run(path.join(__dirname, '../generators/app'))
                        .inDir(path.join(__dirname, './tmp'))
                        .withOptions(_.omit(utils.generateTestPayload("helm", language, serviceCombo), "deploy_options"));
                });
        
                it('create cli-config for CLI tool', function () {
                    assert.file(['cli-config.yml']);
                })

                it('does not create deployment assets', function () {
                    assert.noFile(['service.yaml', 'manifest.yaml']);
                    assert(!fs.existsSync("chart/"));
                })
            });
        });
    });
});