#!/bin/bash

STACK=ci.docker-compose.yml

echo "Skipping deployment"

# scp scripts/$STACK ci@$@:/home/ci/$STACK
# ssh ci@$@ "docker stack deploy -c /home/ci/$STACK agnaistic"