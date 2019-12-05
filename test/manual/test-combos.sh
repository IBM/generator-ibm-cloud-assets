#!/usr/bin/env bash

set -e

echo "========================================================================="
echo "Testing spring knative no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-knative-no-svc.json https://github.com/IBM/spring-microservice.git

echo "========================================================================="
echo "Testing spring knative cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-knative-cloudant.json https://github.com/IBM/spring-microservice.git

echo "========================================================================="
echo "Testing spring knative appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-knative-appid.json https://github.com/IBM/spring-microservice.git

echo "========================================================================="
echo "Testing spring knative cos"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-knative-cos.json https://github.com/IBM/spring-microservice.git



echo "========================================================================="
echo "Testing liberty knative no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-liberty-knative-no-svc.json https://github.com/IBM/java-liberty-microservice.git

echo "========================================================================="
echo "Testing liberty knative cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-liberty-knative-cloudant.json https://github.com/IBM/java-liberty-microservice.git



echo "========================================================================="
echo "Testing spring helm no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-helm-no-svc.json https://github.com/IBM/spring-microservice.git

echo "========================================================================="
echo "Testing spring helm cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-helm-cloudant.json https://github.com/IBM/spring-microservice.git

echo "========================================================================="
echo "Testing spring helm cos"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-helm-cos.json https://github.com/IBM/spring-microservice.git

echo "========================================================================="
echo "Testing spring helm appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-spring-helm-appid.json https://github.com/IBM/spring-microservice.git



echo "========================================================================="
echo "Testing go knative no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-go-knative-no-svc.json https://github.com/IBM/go-microservice.git

echo "========================================================================="
echo "Testing go knative cloudant"
echo "========================================================================="
./test-combo.sh test-genv2-app-go-knative-cloudant.json https://github.com/IBM/go-microservice.git

echo "========================================================================="
echo "Testing go knative appid"
echo "========================================================================="
./test-combo.sh test-genv2-app-go-knative-appid.json https://github.com/IBM/go-microservice.git



echo "========================================================================="
echo "Testing node express knative no svc"
echo "========================================================================="
./test-combo.sh test-genv2-app-express-knative-no-svc.json https://github.com/IBM/nodejs-microservice.git
