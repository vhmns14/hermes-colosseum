.PHONY: help sim test clean

help:
	@echo "Hermes Colosseum - Command Targets:"
	@echo "  make sim        - Run autonomous 5-player multi-agent match simulation"
	@echo "  make test       - Run test suite via bun test"
	@echo "  make clean      - Clean generated match reports and artifacts"

sim:
	bun run src/cli.ts sim

test:
	bun test

clean:
	rm -rf reports/*.html reports/*.md
