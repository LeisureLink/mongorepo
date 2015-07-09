'use strict';

/* This file's documentation is compiled with JsDoc. */
var util = require('util');
var events = require('events');
var assert = require('assert-plus');
var deep = require('deep-diff');
var moment = require('moment');
var JsonPointer = require('json-ptr');
var format = util.format;
var CreatedEventData = require('./lib/created');
var BatchCreatedEventData = require('./lib/batch-created');
var UpdatedEventData = require('./lib/updated');
var FetchedEventData = require('./lib/fetched');
var DeletedEventData = require('./lib/deleted');
var ModelTransformStream = require('./lib/transform-stream');

function prepareJsonPointers(pointers) {
  if (pointers && pointers.length) {
    var res = [],
        i = -1,
        len = pointers.length;
    while (++i < len) {
      if (typeof pointers[i] === 'string') {
        res.push(JsonPointer.create(pointers[i]));
      } else if (pointers[i] instanceof JsonPointer) {
        res.push(pointers[i]);
      } else {
        throw new TypeError(format('Pointers must be JSON Pointers or strings: %s.', pointers[i]));
      }
    }
    return res;
  }
}

function setValueForAllPointers(obj, pointers, val) {
  if (pointers && pointers.length) {
    var i = -1,
        len = pointers.length;
    while (++i < len) {
      pointers[i].set(obj, val);
    }
  }
}

function setTimestampForAllPointers(obj, pointers) {
  if (pointers) {
    var now = moment.utc().toDate();
    setValueForAllPointers(obj, pointers, now);
  }
}

/**
 * @callback identityAccessor Callback function that accesses the specified model's `identity`.
 * @param {object} model An instance of the repository's domain model.
 * @returns {string} The specified model's id.
 */

/**
 * Creates a new MongoRepo on the specified mongo `db`, and whose behavior is controlled by `options`.
 * @class
 * @extends EventEmitter
 *
 * @param {object} db - The MongoClient instance where the repository gets its collection.
 * @param {object} options - Initialization options for the repository.
 * @param {string} option.collection - The name of the collection on MongoDb where this repository's data is stored.
 * @param {string|identityAccessor} [option.id="_id"] - Either an optional property name that identifies which of the domain model's properties corresponds to an instance's identity or an {@link identityAccessor} callback that returns the model's identity.
 * @param {string} [option.descriptiveName="Data model"] - An optional descriptive name for the domain model; used in logging and error messages.
 * @param {string[]} [option.timestampOnCreate=[]] - An optional array of JSON Pointers identifying property paths that the repository will set to the current UTC date when #create() is called.
 * @param {string[]} [option.timestampOnUpdate=[]] - An optional array of JSON Pointers identifying property paths that the repository will set to the current UTC date when #update() is called.
 *
 * This repository implementation is one-to-one with a domain model. Its purpose is to provide boilerplate CRUD operations for a single domain model.
 *
 * @author Phillip Clark <phillip@flitbit.com>
 */
function MongoRepo(db, options) {
  assert.object(db, 'db');
  assert.object(options, 'options');
  assert.string(options.collection, 'options.collection');
  assert.optionalString(options.descriptiveName, 'options.descriptiveName');
  assert.optionalArrayOfString(options.timestampOnCreate, 'options.timestampOnCreate');
  assert.optionalArrayOfString(options.timestampOnUpdate, 'options.timestampOnUpdate');

  events.EventEmitter.call(this);

  /**
   * Fired when a model is created on the data store.
   *
   * @event MongoRepo~created
   * @type {CreatedEventData|BatchCreatedEventData}
   */
  /**
   * Fired when a model is updated on the data store.
   *
   * @event MongoRepo#updated
   * @type {UpdatedEventData}
   *
   */
  /**
   * Fired when a model is deleted from the data store.
   *
   * @event MongoRepo#deleted
   * @type {DeletedEventData}
   *
   */
  /**
   * Fired when a model is fetched from the data store.
   *
   * @event MongoRepo#fetched
   * @type {FetchedEventData}
   *
   */

  var _idOp;

  var _timestampOnCreate = prepareJsonPointers(options.timestampOnCreate);
  var _timestampOnUpdate = prepareJsonPointers(options.timestampOnUpdate);

  Object.defineProperties(this, {

    /**
     * The descriptive name of the domain model; used by the base class when generating errors and log messages.
     * @member {string} _descriptiveName
     * @memberOf MongoRepo
     * @instance
     */
    _descriptiveName: {
      value: options.descriptiveName || 'Domain model'
    },

    /**
     * The {@link identityAccessor} used by the repository to get the specified domain model's `identity`.
     * @member {identityAccessor} _dataIdFromModel
     * @memberOf MongoRepo
     * @instance
     */
    _dataIdFromModel: {
      get: function get_dataIdFromModel() {
        return _idOp;
      },
      set: function set_dataIdFromModel(accessor) {
        assert.func(accessor);
        _idOp = accessor;
      },
      enumerable: true
    },

    _makeModelIdAccessorForPropertyName: {
      /**
       * Creates and assigns an {@link identityAccessor} to the repository's `_dataIdFromModel` property.
       * @function _makeModelIdAccessorForPropertyName
       * @param {string} name The name of the domain model's property that corresponds to the data model's unique Id. *
       * @return undefined
       *
       * @memberOf MongoRepo
       * @instance
       * @see MongoRepo#_dataIdFromModel
       */
      value: function _makeModelIdAccessorForPropertyName(name) {
        assert.string(name);
        _idOp = function(model) {
          if (model) {
            return model[name];
          }
        };
      },
      enumerable: true
    },

    /**
     * An array of JSON pointers identifying property paths that the repository will set to the current UTC date when {@link MongoRepo#create} is called.
     * @member {JsonPointer[]|string[]} _timestampOnCreate
     * @memberOf MongoRepo
     * @instance
     */
    _timestampOnCreate: {
      get: function() {
        return _timestampOnCreate;
      },
      set: function(val) {
        assert.arrayOfString(val, '_timestampOnCreate');
        _timestampOnCreate = prepareJsonPointers(val);
      },
      enumerable: true
    },

    /**
     * An array of JSON pointers identifying property paths that the repository will set to the current UTC date when {@link MongoRepo#update} is called.
     * @member {JsonPointer[]|string[]} _timestampOnUpdate
     * @memberOf MongoRepo
     * @instance
     */
    _timestampOnUpdate: {
      get: function() {
        return _timestampOnUpdate;
      },
      set: function(val) {
        assert.arrayOfString(val, '_timestampOnUpdate');
        _timestampOnUpdate = prepareJsonPointers(val);
      },
      enumerable: true
    },

    /**
     * Provides access to the MongoClient instance used by the repository.
     * @member {MongoClient} _db
     * @memberOf MongoRepo
     * @instance
     */
    _db: {
      value: db
    },

    /**
     * The name of the repository's data collection on the MongoDB backend.
     * @member {string} _namespace
     * @memberOf MongoRepo
     * @instance
     */
    _namespace: {
      value: options.collection
    },

    /**
     * The mongodb collection underlying the repository's operations.
     * @member {MongoCollection} _collection
     * @memberOf MongoRepo
     * @instance
     */
    _collection: {
      value: db.collection(options.collection)
    }

  });

  var typId = typeof options.id;
  if (typId === 'function') {
    this._dataIdFromModel = options.id;
  } else {
    this._makeModelIdAccessorForPropertyName(options.id || "_id");
  }
}
util.inherits(MongoRepo, events.EventEmitter);

Object.defineProperties(MongoRepo.prototype, {

  _notFoundError: {
    value: Error,
    enumerable: true,
    writable: true
  },

  _conflictError: {
    value: Error,
    enumerable: true,
    writable: true
  },

  _transformData: {
    /**
     * Used by the repository to transforms a data model retrieved from underlying mongodb into a domain model.
     * The default implementation returns the model as-is.
     * @function _transformData
     * @param {object} data The data model.
     * @return {object} The domain model.
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function _transformData(data) {
      return data;
    },
    enumerable: true,
    writable: true
  },

  _transformModel: {
    /**
     * Used by the repository to transform a domain model into the representation stored in data (data model).
     * The default implementation returns the model as-is.
     * @function _transformModel
     * @param {object} model The domain model.
     * @return {object} The data model.
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function _transformModel(model) {
      return model;
    },
    enumerable: true,
    writable: true
  },

  _beforeCreateDataModel: {
    /**
     * Callback method invoked by the repository before creating the data model on the underlying mongodb; enables subclass manipulation of the data right before being stored.
     * @function _beforeCreateDataModel
     * @param {object} data The data model.
     * @return {object} The data model.
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function _beforeCreateDataModel(data) {
      var pointers = this._timestampOnCreate;
      if (pointers) {
        setTimestampForAllPointers(data, pointers);
      }
      return data;
    },
    enumerable: true,
    writable: true
  },

  _beforeUpdateDataModel: {
    /**
     * Callback method invoked by the repository before updating the data model on the underlying mongodb; enables subclass manipulation of the data right before being stored.
     * @function _beforeUpdateDataModel
     * @param {object} data The data model.
     * @return {object} The data model.
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function _beforeUpdateDataModel(data) {
      var pointers = this._timestampOnUpdate;
      if (pointers) {
        setTimestampForAllPointers(data, pointers);
      }
      return data;
    },
    enumerable: true,
    writable: true
  },

  _filterUpdatedProperties: {
    value: function _filterUpdatedProperties(path, key) {
      return false;
    },
    writable: true
  },

  _makeUpdateSet: {
    /**
     * Callback method invoked by the repository to calculate the updates to be pushed to the underlying mongodb; enables subclass manipulation of the data right before being stored.
     * The default implementation makes an update set that uses the Mongo Native Client's $set syntax. It constructs an object that contains instructions that send only the differences to the server.
     * @function _makeUpdateSet
     * @param {object} orig The data model as recently fetched from the backend mongodb.
     * @param {object} updated The (potentially) updated data model.
     * @return {object} An update set.
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function _makeUpdateSet(orig, updated) {
      var changes = [];
      deep.observableDiff(orig, updated,
        function(change) {
        changes.push(change);
      },
        this._filterUpdatedProperties.bind(this)
      );
      var edited, removed, i = -1,
          len = changes.length;
      if (len) {
        while (++i < len) {

          if (changes[i].kind === 'A') {
            if (changes[i].item.kind === 'E' || changes[i].item.kind === 'N') {
              if (!edited) {
                edited = {};
              }
              edited[changes[i].path.join('.') + '.' + changes[i].index] = changes[i].rhs;
            } else {
              if (!removed) {
                removed = {};
              }
              removed[changes[i].path.join('.') + '.' + changes[i].index] = 1;
            }
          } else {
            if (changes[i].kind === 'E' || changes[i].kind === 'N') {
              if (!edited) {
                edited = {};
              }
              edited[changes[i].path.join('.')] = changes[i].rhs;
            } else {
              if (!removed) {
                removed = {};
              }
              removed[changes[i].path.join('.')] = 1;
            }
          }
        }
      }
      var res = {};
      if (edited) {
        res.$set = edited;
      }
      if (removed) {
        res.$unset = removed;
      }
      return res;
    },
    enumerable: true,
    writable: true
  },

  _objectNotFound: {
    /**
     * Callback method invoked by the repository when an object cannot be found on the backend (when looked up by Id).
     * @function _objectNotFound
     * @param {string} id The identity that did not correspond with existing data on the underlying mongodb.
     * @param {function(object,object):undefined} callback The callback where errors or results are returned to the caller.
     * @return undefined
     *
     * @memberOf MongoRepo
     * @instance
     */
    get: function get_objectNotFound() {
      var self = this;
      return this.handleObjectNotFound || function default_ObjectNotFound(id, callback) {
        callback(new self._notFoundError(format('%s not found: %s.', self._descriptiveName, id)));
      };
    },
    enumerable: true
  },

  _objectNotFoundOnUpdate: {
    /**
     * Callback method invoked by the repository when an object cannot be found during an update.
     * @function _objectNotFoundOnUpdate
     * @param {string} id The identity that did not correspond with existing data on the underlying mongodb.
     * @param {function(object,object):undefined} callback The callback where errors or results are returned to the caller.
     * @return undefined
     *
     * @memberOf MongoRepo
     * @instance
     */
    get: function get_objectNotFoundOnUpdate() {
      var self = this;
      return this.handleObjectNotFoundOnUpdate || function default_ObjectNotFoundOnUpdate(model, callback) {
        self._objectNotFound(self._dataIdFromModel(model, callback));
      };
    },
    enumerable: true
  },

  validate: {
    /**
     * Callback method invoked by the repository before storing a model ({@link MongoRepo#create} and {@link MongoRepo#update}).
     * The default implementation does not perform validation.
     * @function validate
     * @param {object} model The domain model being stored.
     * @param {function(object,object):undefined} callback The callback where errors or results are returned to the caller.
     * @return undefined
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function validate(model, callback) {
      callback();
    },
    enumerable: true,
    writable: true
  },

  translateDbError: {
    /**
     * Callback method invoked by the repository when it receives errors from the underlying mongodb.
     * @function translateDbError
     * @param {object} err The error returned by  mongodb
     * @return {object} The error, translated for the caller.
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function translateDbError(err) {
      var msg = (typeof err === 'string') ? err : err.message;

      if (msg.indexOf('duplicate key error') > 0) {
        return new this._conflictError('Creating the resource would cause a conflict on the server.');
      }

      return err;
    },
    enumerable: true
  },

  getById: {
    /**
     * Gets a model from the the repository by the model's Id.
     * @function getById
     * @param {string} id The model's identity.
     * @param {function(object,object):undefined} callback The callback where an error or the model is returned to the caller.
     * @return undefined
     * @fires fetched
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function getById(id, callback) {
      assert.ok(id, 'id');
      var self = this;
      this._collection.findOne({
        _id: id
      }, function(err, data) {
        if (err) {
          return callback(err);
        }
        if (data === null) {
          return self._objectNotFound(id, callback);
        }
        var model = self._transformData(data);
        self.emit('fetched', new FetchedEventData(id, model));
        callback(null, model);
      });
    },
    enumerable: true,
    writable: true
  },

  findMatch: {
    /**
     * Finds objects matching the specified query. This method is a raw pass-through to the underlying driver. Upon success,
     * a stream is returned to the caller via callback. The stream's `data` event must be observed in order to read the resulting
     * raw data that satisfies the query. Streaming is complete when the `end` event is fired.
     * @function findMatch
     * @param {object} match A mongo native client `find` specification.
     * @param {function(object,object):undefined} callback The callback where an error or the stream is returned to the caller.
     * @return undefined
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function findMatch(match, callback) {
      assert.object(match, 'match');
      var self = this;
      try {
        var source = this._collection.find(match).stream();
        var modelTransform = new ModelTransformStream(this._transformData.bind(this));
        source.pipe(modelTransform);
        callback(null, modelTransform);
      } catch (err) {
        callback(err);
      }
    },
    enumerable: true,
    writable: true
  },

  findWindowedMatch: {
    /*
     * Finds objects, sorts them, and applies skip() & limit() functions to the result. The arguments to this method are passed directly
     * to the underlying driver's MongoBD collection object.
     * @function findWindowedMatch
     * @param {object} match - A mongodb native client find object
     * @param {object} sort - A mongodb native client sort specification
     * @param {number} skip - How results to skip before returning an item
     * @param {number} limit - Limit on the total number of results to return
     * @param {}
     * @memberOf MongoRepo
     * @instance
     */
    value: function findWindowedMatch(match, sort, skip, limit, callback) {
      assert.object(match, 'match');
      assert.object(sort, 'sort');
      assert.number(skip, 'skip');
      assert.number(limit, 'limit');
      assert.func(callback, 'callback');
      var self = this,
          source,
          modelTransform;
      try {
        source = self._collection.find(match)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .stream();
        modelTransform = new ModelTransformStream(this._transformData.bind(this));
        source.pipe(modelTransform);
        callback(null, modelTransform);
      } catch (e) {
        callback(e);
      }
    },
    enumerable: true,
    writable: true
  },

  create: {
    /**
     * Creates the data on the underlying storage for the specified domain model.
     * @method create
     * @param {object} model The domain model supplying data to the underlying data model.
     * @param {function} callback A callback function invoked by the repository when the operation completes.
     * @return undefined
     * @fires MongoRepo#created
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function create(model, callback) {
      assert.object(model, 'model');
      var self = this;
      this.validate(model, function postValidateCreate(err) {
        if (err) {
          return callback(err);
        }
        var data = self._transformModel(model);
        data = self._beforeCreateDataModel(data);

        if (!data._id) {
          var id = self._dataIdFromModel(model);
          if (id) {
            data._id = id;
          }
        }

        self._collection.insert(data, {
          w: 1
        }, function(err, res) {
          if (err) {
            return callback(self.translateDbError(err));
          }
          var result = Array.isArray(res) ? res[0] : res;
          var model = self._transformData(result);
          self.emit('created', new CreatedEventData(self._dataIdFromModel(model), model));
          callback(null, model);
        });
      });
    },
    enumerable: true,
    writable: true
  },

  batchCreate: {
    /**
     * Creates the provided models on the underlying storage as a batch.
     * @method batchCreate
     * @param {object[]} models The domain models supplying data to be stored.
     * @param {function} callback A callback function invoked by the repository when the operation completes.
     * @return undefined
     * @fires MongoRepo#created
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function create(models, callback) {
      assert.arrayOfObject(models, 'models');
      var self = this,
          i = -1,
          len = models.length,
          last = len - 1,
          count = 0,
          invalid = [],
          valid = [],
          ea = function(index, model, err) {
            if (err) {
              invalid.push({
                index: index,
                model: models[index],
                error: err
              });
            } else {
              var data = self._transformModel(model);
              data = self._beforeCreateDataModel(data);
              if (!data._id) {
                var id = self._dataIdFromModel(model);
                if (id) {
                  data._id = id;
                }
              }
              valid.push(data);
            }
            if (++count === len) {
              if (invalid.length) {
                return callback(invalid);
              }
              self._collection.insert(valid, {
                w: 1
              }, function(err, res) {
                if (err) {
                  return callback(self.translateDbError(err));
                }
                var j = -1,
                    jlen = res.length,
                    model, created = [],
                    evt = [];
                while (++j < jlen) {
                  model = self._transformData(res[j]);
                  created.push(model);
                  evt.push(new CreatedEventData(
                    self._dataIdFromModel(model),
                  model
                  ));
                }
                self.emit('created', new BatchCreatedEventData(evt));
                callback(null, created);
              });
            }
          };

      while (++i < len) {
        this.validate(models[i], ea.bind(this, i, models[i]));
      }
    },
    enumerable: true,
    writable: true
  },

  update: {
    /**
     * Updates an existing model on the underlying storage.
     * @method update
     * @param {object} model The domain model providing the updates.
     * @param {function} callback A callback function invoked by the repository when the operation completes.
     * @return undefined
     * @fires MongoRepo#updated
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function update(model, callback) {
      assert.object(model, 'model');
      var self = this;
      this.validate(model, function postValidateUpdate(err) {
        if (err) {
          return callback(err);
        }

        var updated = self._transformModel(model);
        updated = self._beforeUpdateDataModel(updated);
        var id = self._dataIdFromModel(model);
        var idRef = {
          _id: id
        };
        self._collection.findOne(idRef, function(err, data) {
          if (err) {
            return callback(self.translateDbError(err));
          }
          if (data === null) {
            return self._objectNotFoundOnUpdate(model, callback);
          }

          var changes = self._makeUpdateSet(data, updated);
          if (changes.$set || changes.$unset) {
            if (self._timestampOnUpdate) {
              if (!changes.$set) changes.$set = {};
              setValueForAllPointers(changes.$set, self._timestampOnUpdate, new Date());
            }
            // allow sub-classes to modify the update set...
            if (self._afterMakeUpdateSet) {
              changes = self._afterMakeUpdateSet(data, updated, changes);
            }
            self._collection.update(idRef, changes, function(err, res) {
              if (err) {
                return callback(self.translateDbError(err));
              }
              if (res) {
                var num = !isNaN(res) ? res : !isNaN(res.n) ? res.n : 0;
                self.emit('updated', new UpdatedEventData(id, changes, res.n));
                callback(null, res);
              } else {
                self._objectNotFoundOnUpdate(model, callback);
              }
            });
          } else {
            callback();
          }
        });

      });
    },
    enumerable: true
  },

  del: {
    /**
     * Deletes a model from the underlying storage.
     * @method del
     * @param {string} id The model's identity.
     * @param {function} callback A callback function invoked by the repository when the operation completes.
     * @return undefined
     * @fires MongoRepo#deleted
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function del(id, callback) {
      assert.ok(id, 'id');
      var self = this;
      self._collection.remove({
        _id: id
      }, {
        w: 1
      }, function(err, res) {
        if (err) {
          return callback(self.translateDbError(err));
        }
        if (res) {
          self.emit('deleted', id);
        }
        callback(null, res);
      });
    },
    enumerable: true
  },

  delMatch: {
    /**
     * Deletes models matching the specified query.
     * @method delMatch
     * @param {string} match A mongo native client `del` specification.
     * @param {function} callback A callback function invoked by the repository when the operation completes.
     * @return undefined
     * @fires MongoRepo#deleted
     *
     * @memberOf MongoRepo
     * @instance
     */
    value: function del(match, callback) {
      assert.object(match, 'match');
      var self = this;
      self._collection.remove(match, {
        w: 1
      }, function(err, res) {
        if (err) {
          return callback(self.translateDbError(err));
        }
        if (res) {
          self.emit('deleted', {
            match: match,
            count: res
          });
        }
        callback(null, res);
      });
    },
    enumerable: true
  }

});

module.exports = MongoRepo;
