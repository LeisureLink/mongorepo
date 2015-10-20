'use strict';

/*global setTimeout: false, it: false, describe: false, before: false, after: false, afterEach: false*/
var util = require('util')
  , expect = require('expect.js')
  , uuid = require('node-uuid')
  , MongoClient = require('mongodb').MongoClient
  , MongoRepo = require('../')
  ;

function throwIfErrorOrFalsyResult(err, res) {
  if (err) { throw err; }
  if (!res) { throw new Error('Result is falsy: ' + util.inspect(res, false, 9)); }
}

function throwIfError(err) {
  if (err) { throw err; }
}

describe('MongoRepo', function() {
  var _db;

  // make unique collection names to isolate tests run on diff machines but connecting
  // to same mongodb...
  var collectionName = 'test-'.concat(uuid.v4());
  var options = {
    collection: collectionName
  };

  before(function(done) {
    // Ensure we are connected to a db...
    var mongohost = process.env.MONGODB_TEST_URL || 'mongodb://127.0.0.1:27017/test';
    MongoClient.connect(mongohost, function(err, db) {
      if (err) {
        util.log("Failed to connect to the MongoDB server. These tests use the default `test` database present with a new install of MongoDB.");
        util.log("Ensure you have mongo running locally on the default port 27017");

        throw err;
      }
      _db = db;
      done();
    });
  });

  describe('with a constructed MongoRepo and minimal options', function() {
    var _repo;

    function pollWaitForDb(done) {
      if (_db) {
        _repo = new MongoRepo(_db, {
          collection: collectionName
        });
        return done();
      }
      setTimeout(function() { pollWaitForDb(done); }, 200);
    }

    before(function(done) {
      pollWaitForDb(done);
    });

    after(function() {
      // drop the collections used by the tests
      if (_repo) {
        _repo._collection.drop();
      }
    });

    it('constructed instance has specified collection name', function() {
      expect(_repo).to.have.property('_namespace');
      expect(_repo._namespace).to.be(options.collection);
    });

  });

  describe('after constructing the repo', function() {
    var _repo;

    function pollWaitForDb(done) {
      if (_db) {
        _repo = new MongoRepo(_db, {
          collection: collectionName
        });
        return done();
      }
      setTimeout(function() { pollWaitForDb(done); }, 200);
    }

    before(function(done) {
      pollWaitForDb(done);
    });

    after(function() {
      // drop the collections used by the tests
      if (_repo) {
        _repo._collection.drop();
      }
    });

    describe('#create', function() {

      it('can create record', function(done) {
        _repo.create({
          _id: '123',
          field: 'a field',
          arrayField: ['data']
        }, function(err) {
          if (err) {
            done(err);
          } else {
            done();
          }
        });
      });

    });

    describe('#getById', function() {

      before('create record', function(done) {
        _repo.create({
          _id: '456',
          field: 'a field',
          arrayField: ['data']
        }, function(err) {
          if (err) {
            done(err);
          } else {
            done();
          }
        });
      });

      it('can get a record', function(done) {
        _repo.getById('456', function(err, model) {
          if (err) {
            done(err);
          } else {
            expect(model).to.be.ok();
            expect(model.field).to.be('a field');
            expect(model.arrayField.length).to.be(1);
            expect(model.arrayField[0]).to.be('data');
            done();
          }
        });

      });

    });

    describe('#update', function() {

      before('create record', function(done) {
        _repo.create({
          _id: '789',
          field: 'a field',
          arrayField: ['data']
        }, function(err) {
          if (err) {
            done(err);
          } else {
            done();
          }
        });
      });

      it('should support adding to an existing array on a record', function(done) {
        _repo.update({
          _id: '789',
          arrayField: ['data', { other: 'thing' }]
        }, function(err) {
          if (err) {
            done(err);
          } else {
            _repo.getById('789', function(err, model) {
              if (err) {
                done(err);
              } else {
                expect(model).to.be.ok();
                expect(model.field).to.not.be.ok();
                expect(model.arrayField.length).to.be(2);
                expect(model.arrayField[1].other).to.be('thing');
                done();
              }
            });
          }
        });
      });

      it('should support adding an array to the record', function(done) {
        _repo.update({
          _id: '789',
          arrayField: ['data', { other: 'thing' }],
          anotherArray: ['foo']
        }, function(err) {
          if (err) {
            done(err);
          } else {
            _repo.getById('789', function(err, model) {
              if (err) {
                done(err);
              } else {
                expect(model).to.be.ok();
                expect(model.anotherArray).to.be.ok();
                expect(model.anotherArray.length).to.be(1);
                expect(model.anotherArray[0]).to.be('foo');
                done();
              }
            });
          }
        });
      });
    });

    describe('#del', function() {
      before('create record', function(done) {
        _repo.create({
          _id: 'todelete',
          field: 'a field',
          arrayField: ['data']
        }, function(err) {
          if (err) {
            done(err);
          } else {
            done();
          }
        });
      });

      it('can delete', function(done) {
        _repo.del('todelete', function(err) {
          if (err) {
            done(err);
          } else {
            _repo.getById('todelete', function(err, model) {
              expect(err).to.be.ok();
              expect(err).to.match(/not found/);
              expect(model).to.not.be.ok();
              done();              
            });
          }
        });
      });

    });

    describe('given an existing record with an object array', function() {
      before('create initial record', function(done) {
        _repo.create({
          _id: '124',
          arrayField: [{ id: 'foo', other: 7 }, { id: 'bar', other: 8 }]
        }, function(err) {
          if (err) {
            done(err);
          } else {
            done();
          }
        });
      });

      it('should support removing an element from the existing array', function(done) {
        _repo.update({
          _id: '124',
          arrayField: [{ id: 'foo', other: 7 }]
        }, function(err) {
          if (err) {
            done(err);
          } else {
            _repo.getById('124', function(err, model) {
              if (err) {
                done(err);
              } else {
                expect(model).to.be.ok();
                expect(model.arrayField.length).to.be(1);
                expect(model.arrayField[0].id).to.be('foo');
                done();
              }
            });
          }
        });
      });


      it('should support editing an element in an existing array on a record', function(done) {
        _repo.update({
          _id: '124',
          arrayField: [{ id: 'foo', other: 9 }]
        }, function(err) {
          if (err) {
            done(err);
          } else {
            _repo.getById('124', function(err, model) {
              if (err) {
                done(err);
              } else {
                expect(model).to.be.ok();
                expect(model.arrayField.length).to.be(1);
                expect(model.arrayField[0].other).to.be(9);
                done();
              }
            });
          }
        });
      });
    });

    describe('given an existing record with a 1 element object array', function() {
      var _record;

      before('create initial record', function(done) {
        _repo.create({
          _id: '125',
          arrayField: [{ id: 'foo', other: 7 }]
        }, function(err) {
          if (err) {
            done(err);
          } else {
            done();
          }
        });
      });

      it('should support removing the last element from the existing array and leave the array', function(done) {
        _repo.update({
          _id: '125',
          arrayField: []
        }, function(err) {
          if (err) {
            done(err);
          } else {
            _repo.getById('125', function(err, model) {
              if (err) {
                done(err);
              } else {
                expect(model).to.be.ok();
                expect(model.arrayField.length).to.be(0);
                done();
              }
            });
          }
        });
      });


      it('should support editing an element in an existing array on a record', function(done) {
        _repo.update({
          _id: '124',
          arrayField: [{ id: 'foo', other: 9 }]
        }, function(err) {
          if (err) {
            done(err);
          } else {
            _repo.getById('124', function(err, model) {
              if (err) {
                done(err);
              } else {
                expect(model).to.be.ok();
                expect(model.arrayField.length).to.be(1);
                expect(model.arrayField[0].other).to.be(9);
                done();
              }
            });
          }
        });
      });
    });
  });

});
