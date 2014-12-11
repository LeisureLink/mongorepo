JSDOC ?= jsdoc
NPM ?= npm
VSN ?= debug
DOCS_OUT ?= docs

all: deps test

docs:
	$(JSDOC) index.js lib/ -d $(DOCS_OUT)

deps: install

test:
	@MONGOHOST=localhost NODE_ENV=test \
	mocha -R spec

install link:
	@npm $@

.PHONY: deps all test docs
