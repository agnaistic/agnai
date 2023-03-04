#!/bin/bash

STACK=agn.docker-compose.yml

scp .github/$STACK ci@$@:/home/ci/$STACK
# ssh ci@$@ "docker stack deploy -c /home/ci/$STACK agnaistic"