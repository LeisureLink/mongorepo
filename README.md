# mongorepo [![Circle CI](https://circleci.com/gh/VacationRoost/mongorepo.svg?style=svg&circle-token=35a069a8830bbf4f30e0a5a94ecd17ebf975b70f)](https://circleci.com/gh/VacationRoost/mongorepo)

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

See the [examples](https://github.com/VacationRoost/mongorepo/blob/master/examples/raw-repo-example.js) for more.

## Tests

Tests are written using [Mocha](http://mochajs.org/) and [expect.js](https://github.com/Automattic/expect.js).

```bash
npm test
```

... or ...

```bash
mocha -R spec
```

### Required Local Configuration For Tests To Succeed

The tests assume there is a [MongoDB](http://www.mongodb.org/) instance running on the default mongo port 27017.

The tests consult the environment variable `MONGOHOST` before connecting to MongoDB. If there is no environment variable, it uses `localhost`. You can indicate the remote mongo location on the command line (bash):

```bash
# Use the appropriate IP,
#   a Dockerized MongoDB would be located at the below
#   address on a Windows or a Mac OS X machine:
MONGOHOST=192.168.59.103 npm test
```

### Easy Local MongoDB Setup using Docker

If you don't have mongodb installed we recommend installing [Docker](https://docs.docker.com) which enables you to quickly launch and run virtualized containers on your local machine \[[Windows Install Instructions](https://docs.docker.com/installation/windows/)\].

Once you've got `Docker` on your system the following command will run mongodb in a container and map the default port to your localhost:

```bash
docker run -d -p 27017:27017 --name mongodb dockerfile/mongodb
```

Once you've run the mongodb docker container once, you can start and stop it from the command line:

```bash
docker stop mongodb
```

```bash
docker start mongodb
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

## Releases

```
2014-12-09 0.1.2 Fixes bug in #batchCreate
```
