/*
 © Copyright IBM Corp. 2019
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
var memFs = require("mem-fs");
var editor = require("mem-fs-editor");
var store = memFs.create();
var fs = editor.create(store);

const PATH_SERVICE_CREDS_SAMPLES = "./samples/service_creds.json";

function getServiceCreds(serviceKey) {
    var serviceCreds = fs.readJSON(PATH_SERVICE_CREDS_SAMPLES);
    return serviceCreds[serviceKey];
}

function generateAppOpts(type, language) {
    return {
        application: {
            app_id: `1234-5678-${type}-${language}-0987654321`,
            name: `test-genv2-app-${type}-${language}`,
            language: language,
            service_credentials: {}
        }
    };
}

function generateDeployOpts(type, cloud_deploy_type) {
    let deploy_opts = { deploy_options: {} };
    deploy_opts[type] = {};
    if (type === "cloud_foundry") {
        deploy_opts[type]["disk_quote"] = "1G";
        deploy_opts[type]["domain"] = "mydomain.com";
        deploy_opts[type]["hostname"] = "my-app-hostname";
        deploy_opts[type]["instances"] = "3";
        deploy_opts[type]["memory"] = "256MB";
    }
    deploy_opts[type]["service_bindings"] = {};
    return deploy_opts;
}

function generatePayload(app_type, language, deploy_type, cloud_deploy_type, services) {
    
}
