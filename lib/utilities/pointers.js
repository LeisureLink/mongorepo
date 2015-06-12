'use strict';

var util = require('util');
var moment = require('moment');
var format = util.format;

var internals = {};
internals.setValueForAll = function(obj, pointers, val) {
  if (pointers && pointers.length) {
    var i = -1,
      len = pointers.length;
    while (++i < len) {
      pointers[i].set(obj, val);
    }
  }
};

module.exports.prepare = function(pointers) {
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
};

module.exports.setValueForAll = internals.setValueForAll;

module.exports.setTimestampForAll = function(obj, pointers) {
  if (pointers) {
    var now = moment.utc().toDate();
    internals.setValueForAll(obj, pointers, now);
  }
};