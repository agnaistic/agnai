#!/bin/bash

ssh ci@$@ "docker stack deploy -c /home/ci/dev-agn.docker-compose.yml dev-agnai"