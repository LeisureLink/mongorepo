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

describe('MongoRepo', function () {
  var _db;

  // make unique collection names to isolate tests run on diff machines but connecting
  // to same mongodb...
  var collectionName = 'test-'.concat(uuid.v4());
  var options = {
    collection: collectionName
  };

  before(function (done) {
    // Ensure we are connected to a db...
    //   NOTE:
    var mongohost = process.env.MONGODB_TEST_URL || 'mongodb://127.0.0.1:27017/test';
    MongoClient.connect(mongohost, function (err, db) {
      if (err) {
        util.log("Failed to connect to the MongoDB server. These tests use the default `test` database present with a new install of MongoDB.");
        util.log("Ensure you have mongo running locally on the default port 27017");

        throw err;
      }
      _db = db;
      done();
    });
  });

  describe('with a constructed MongoRepo and minimal options', function () {
    var _repo;

    function pollWaitForDb(done) {
      if (_db) {
        _repo = new MongoRepo(_db, {
          collection: collectionName
        });
        return done();
      }
      setTimeout(function () { pollWaitForDb(done); }, 200);
    }

    before(function (done) {
      pollWaitForDb(done);
    });

    after(function () {
      // drop the collections used by the tests
      if (_repo) {
        _repo._collection.drop();
      }
    });

    it('constructed instance has specified collection name', function () {
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
      setTimeout(function () { pollWaitForDb(done); }, 200);
    }

    before(function (done) {
      pollWaitForDb(done);
    });

    after(function () {
      // drop the collections used by the tests
      if (_repo) {
        _repo._collection.drop();
      }
    });
    
    describe('given an existing record', function() {
      var _record;
      
      before('create initial record', function(done) {
        _repo.create({ _id: '123',
          field: 'a field',
          arrayField: [ 'data' ] }, function (err) {
          if (err) {
            done(err);
          } else {
            done();
          }
        });
      });
      
      it('should support adding to an existing array on a record', function (done) {
        _repo.update({
          _id: '123',
          arrayField: [ 'data', { other: 'thing' }]
        }, function (err) {
          if (err) {
            done(err);
          } else {
            _repo.getById('123', function(err, model) {
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
    });
  
  });

});
