#!/usr/bin/env bash
source .env
set -x

OPTS_FILE=$1
GIT_REPO_URL=$2
DEBUG=$3

APP_DIR=$OPTS_FILE.dir
#APP_DIR=test.dir

if [[ $GIT_REPO_URL=="meta" ]]; then
    GIT_REPO_URL=$( cat $OPTS_FILE | jq '.metadata.git_url' | tr -d '"')
fi

if [[ -z $GIT_REPO_URL ]]; then
    GIT_REPO_URL=https://github.com/IBM/nodejs-express-app
fi

if [[ -n $DEBUG ]]; then
    DEBUG_OPTS=--inspect-brk;
fi

echo "Removing existing app dir"
rm -rf ./$APP_DIR
git clone $GIT_REPO_URL $APP_DIR --single-branch -b master  

DEPLOY_OPTS=$( cat $OPTS_FILE | jq '.deploy_options' | tr -d ' \t\n\r\f' )
APP_OPTS=$( cat $OPTS_FILE | jq '.application' | tr -d ' \t\n\r\f' )

echo "DEPLOY_OPTS: $DEPLOY_OPTS"
echo "APP_OPTS: $APP_OPTS"

cd $APP_DIR
echo "Running cloud assets"
node $DEBUG_OPTS $YO_PATH ibm-cloud-assets --deploy_options $DEPLOY_OPTS --application $APP_OPTS --force
