.PHONY: install lint format typecheck test all

install:
	poetry install

lint:
	poetry run ruff check .

format:
	poetry run black .

typecheck:
	poetry run mypy .

test:
	poetry run pytest -v

all: lint format typecheck test
