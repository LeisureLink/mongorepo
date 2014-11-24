# mongorepo

A simple repository over MongoDB collections

## Installation

Clone this repository, then use `npm` to install the dependencies:

```bash
npm install
```

## Use

Reference the `MongoRepo` base class using node's `require`:

```javascript
var MongoRepo = require('mongorepo');
```

## Additional Documentation

There is a document tree under the `docs` folder, its a work in progress.

Docs are built from source code comments using [jsdoc](http://usejsdoc.org/).

If you'll be (re)building the docs, install jsdoc globally on your machine:

```bash
npm install -g jsdoc
```

The `Makefile` in the package's root directory contains a `docs` target.

```bash
make docs
```

