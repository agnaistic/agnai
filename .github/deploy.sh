#!/bin/bash

ssh ci@$@ "docker stack deploy -c /home/ci/agn.docker-compose.yml agnaistic"