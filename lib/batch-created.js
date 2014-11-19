var assert = require('assert-plus');

function BatchCreatedEventData(models) {
	assert.arrayOfObject(models, 'models');

	Object.defineProperties(this, {

		models: {
			value: models,
			enumerable: true
		},
	});
}

module.exports = BatchCreatedEventData;