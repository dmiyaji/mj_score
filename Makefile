# Docker Composeでマルチコンテナを管理する
SHELL := /bin/bash

# コンテナ名を定義します
PROJECT_NAME=mjscore-project

build:
	docker compose --project-name $(PROJECT_NAME) build

run:
	docker compose --project-name $(PROJECT_NAME) up --build

bash:
	docker compose --project-name $(PROJECT_NAME) exec nextjs bash

stop:
	docker compose --project-name $(PROJECT_NAME) down