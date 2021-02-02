#!/usr/bin/env bash

set -e

echo "========================================================================="
echo "Testing liberty helm no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-liberty-helm-no-svc.json meta

echo "========================================================================="
echo "Testing liberty helm cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-liberty-helm-cloudant.json meta



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
echo "Testing go helm no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-go-helm-no-svc.json meta

echo "========================================================================="
echo "Testing go helm cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-go-helm-cloudant.json meta

echo "========================================================================="
echo "Testing go helm appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-go-helm-appid.json meta



echo "========================================================================="
echo "Testing node express helm no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-express-helm-no-svc.json meta

echo "========================================================================="
echo "Testing node express helm cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-express-helm-cloudant.json meta

echo "========================================================================="
echo "Testing node express helm appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-express-helm-appid.json meta


echo "========================================================================="
echo "Testing swift helm no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-swift-helm-no-svc.json meta

echo "========================================================================="
echo "Testing swift helm cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-swift-helm-cloudant.json meta

echo "========================================================================="
echo "Testing swift helm appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-swift-helm-appid.json meta


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
