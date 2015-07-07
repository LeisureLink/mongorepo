'use strict';

var util = require('util'),
  mongodb = require('mongodb'),
  uuid = require('node-uuid'),
  expect = require('expect.js'),
  MongoRepo = require('../');

function throwIfErrorOrFalsyResult(err, res) {
  if (err) {
    throw err;
  }
  if (!res) {
    throw new Error('Result is falsy: ' + util.inspect(res, false, 9));
  }
}

function throwIfError(err) {
  if (err) {
    throw err;
  }
}


// make unique collection names to isolate tests run on diff machines.
var collectionName = 'test-'.concat(uuid.v4());

function whenConnected(db) {

  var repo = new MongoRepo(db, {
    collection: collectionName,
    descriptiveName: 'My Test Collection',
    /* Timestamp properties added by the repo: */
    timestampOnCreate: ['#/dateCreatedUtc', '#/dateUpdatedUtc'],
    timestampOnUpdate: ['#/dateUpdatedUtc']
  });

  var minimal = {
    foo: 'bar'
  };

  function fin() {
    repo._collection.drop();
    db.close();
  }

  repo.create(minimal, function(err, created) {
    try {
      if (err) {
        fin();
        throw err;
      }

      // Ids will be assigned automatically if not caller supplied...
      expect(created).to.have.property('_id');
      expect(created._id).to.be.an(mongodb.ObjectID);

      // Other caller supplied properties are propagated to the db.
      expect(created.foo).to.be(minimal.foo);

      // Plus we indicated we wanted some timestamps...
      expect(created).to.have.property('dateCreatedUtc');
      expect(created).to.have.property('dateUpdatedUtc');

      expect(created.dateUpdatedUtc).to.be(created.dateCreatedUtc);

      repo.getById(created._id, function(err, fetched) {
        try {
          if (err) {
            fin();
            throw err;
          }

          // Ids will be assigned automatically if not caller supplied...
          expect(fetched).to.have.property('_id');
          expect(fetched._id).to.be.an(mongodb.ObjectID);
          expect(fetched._id.equals(created._id)).to.be.ok();

          expect(fetched.foo).to.be(minimal.foo);

          // Plus we indicated we wanted some timestamps...
          expect(fetched).to.have.property('dateCreatedUtc');
          expect(fetched).to.have.property('dateUpdatedUtc');

          fetched.foo = 'baz';
          repo.update(fetched, function(err, updated) {
            try {
              if (err) {
                fin();
                throw err;
              }

              expect(updated).to.be(1);
              fin();

            } catch (unexpected) {
              fin();
              throw unexpected;
            }
          });

        } catch (unexpected) {
          fin();
          throw unexpected;
        }
      });


    } catch (unexpected) {
      fin();
      throw unexpected;
    }
  });
}

// Ensure we are connected to a db...
var mongohost = process.env.MONGODB_TEST_URL || 'mongodb://127.0.0.1:27017/test';
mongodb.MongoClient.connect(mongohost, function(err, db) {
  if (err) {
    util.log(util.inspect(err, false, 99));
    throw err;
  }

  whenConnected(db);
});
