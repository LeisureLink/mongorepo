JSDOC ?= jsdoc
NPM ?= npm
VSN ?= debug
DOCS_OUT ?= docs

all: deps test

docs:
	$(JSDOC) index.js lib/ -d $(DOCS_OUT)

deps:
	$(NPM) install

test:
	mocha -R spec

.PHONY: deps all
