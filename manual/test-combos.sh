#!/usr/bin/env bash

set -e

echo "========================================================================="
echo "Testing spring knative no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-knative-no-svc.json meta

echo "========================================================================="
echo "Testing spring knative cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-knative-cloudant.json meta

echo "========================================================================="
echo "Testing spring knative appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-knative-appid.json meta

echo "========================================================================="
echo "Testing spring knative cos"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-knative-cos.json meta



echo "========================================================================="
echo "Testing liberty knative no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-liberty-knative-no-svc.json meta

echo "========================================================================="
echo "Testing liberty knative cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-liberty-knative-cloudant.json meta



echo "========================================================================="
echo "Testing spring helm no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-helm-no-svc.json meta

echo "========================================================================="
echo "Testing spring helm cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-helm-cloudant.json meta

echo "========================================================================="
echo "Testing spring helm cos"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-helm-cos.json meta

echo "========================================================================="
echo "Testing spring helm appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-helm-appid.json meta



echo "========================================================================="
echo "Testing go knative no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-go-knative-no-svc.json meta

echo "========================================================================="
echo "Testing go knative cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-go-knative-cloudant.json meta

echo "========================================================================="
echo "Testing go knative appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-go-knative-appid.json meta



echo "========================================================================="
echo "Testing node express knative no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-express-knative-no-svc.json meta

echo "========================================================================="
echo "Testing node express knative cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-express-knative-cloudant.json meta

echo "========================================================================="
echo "Testing node express knative appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-express-knative-appid.json meta


echo "========================================================================="
echo "Testing swift knative no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-swift-knative-no-svc.json meta

echo "========================================================================="
echo "Testing swift knative cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-swift-knative-cloudant.json meta

echo "========================================================================="
echo "Testing swift knative appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-swift-knative-appid.json meta



echo "========================================================================="
echo "Testing flask knative no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-python-knative-no-svc.json meta

echo "========================================================================="
echo "Testing flask knative cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-python-knative-cloudant.json meta

echo "========================================================================="
echo "Testing flask knative appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-python-knative-appid.json meta


echo "========================================================================="
echo "Testing flask helm no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-python-helm-no-svc.json meta

echo "========================================================================="
echo "Testing flask helm cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-python-helm-cloudant.json meta

echo "========================================================================="
echo "Testing flask helm appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-python-helm-appid.json meta


echo "========================================================================="
echo "Testing flask cf no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-python-cf-no-svc.json meta

echo "========================================================================="
echo "Testing flask cf cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-python-cf-cloudant.json meta

echo "========================================================================="
echo "Testing flask cf appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-python-cf-appid.json meta
