# mongorepo

A simple repository over MongoDB collections

## Installation

Clone this repository, then use `npm` to install the dependencies:

```bash
npm install
```

** Link with NPM **

Since `mongorepo` is a private package, you'll also need to link it with your local NPM to make it available to dependent packages:

```bash
npm link
```

** Let dependencies know where this package is located **

From packages that rely upon `mongorepo`, you'll need to tell NPM to locally link to it:

```bash
# from within the dependent package's root folder...
npm link mongorepo
```

## Documentation

There is a document tree under the `docs` folder, its a work in progress.

