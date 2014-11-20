'use strict';

var util = require('util');
var assert = require('assert-plus');
var Transform = require('stream').Transform;

function ModelTransformStream(transformer) {
	assert.func(transformer, 'transformer');
	Transform.call(this, { objectMode: true});
	this.transformer = transformer;
}
util.inherits(ModelTransformStream, Transform);

Object.defineProperties(ModelTransformStream.prototype, {

	_transform: {
		value: function _transform(data, encoding, done) {
			var model = this.transformer(data);
			this.push(model, encoding);
			done();
		},
		enumerable: true,
		writable: true
	}

});

module.exports = ModelTransformStream;
