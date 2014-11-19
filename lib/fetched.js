var assert = require('assert-plus');

/**
 * Encapsulates data related to a {@link MongoRepo#fetched} event.
 * @class
 *
 * @param {string} id - The fetched model's Id on the underlying data store.
 * @param {object} model - The model.
 *
 */
function FetchedEventData(id, model) {
	assert.string(id, 'id');
	assert.object(model, 'model');

	Object.defineProperties(this, {

		/**
		 * @member {string} id The fetched model's Id on the underlying data store.
		 *
		 * @memberOf FetchedEventData
		 * @instance
		 */
		id: {
			value: id,
			enumerable: true
		},

		/**
		 * @member {object} model The model.
		 *
		 * @memberOf FetchedEventData
		 * @instance
		 */
		model: {
			value: model,
			enumerable: true
		}

	});
}

module.exports = FetchedEventData;