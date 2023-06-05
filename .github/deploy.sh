#!/bin/bash

STACK=agn.docker-compose.yml

ssh ci@$@ "docker stack deploy -c /home/ci/$STACK agnaistic"