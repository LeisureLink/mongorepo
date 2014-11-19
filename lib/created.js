var assert = require('assert-plus');

/**
 * Encapsulates data related to a {@link MongoRepo#created} event.
 * @class
 *
 * @param {string} id - The newly created model's Id on the underlying data store.
 * @param {object} model - The newly created model.
 *
 */
function CreatedEventData(id, model) {
	assert.string(id, 'id');
	assert.object(model, 'model');

	Object.defineProperties(this, {

		/**
		 * @member {string} id The newly created model's Id on the underlying data store.
		 *
		 * @memberOf CreatedEventData
		 * @instance
		 */
		id: {
			value: id,
			enumerable: true
		},

		/**
		 * @member {object} model The newly created model.
		 *
		 * @memberOf CreatedEventData
		 * @instance
		 */
		model: {
			value: model,
			enumerable: true
		}

	});
}

module.exports = CreatedEventData;