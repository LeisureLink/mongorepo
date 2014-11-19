var assert = require('assert-plus');

/**
 * Encapsulates data related to a {@link MongoRepo#updated} event.
 * @class
 *
 * @param {string} id The updated model's Id on the underlying data store.
 * @param {object} changeSet An object that describes the changes that were made.
 * @param {number} affected The number of affected items (either 0 or 1).
 *
 */
function UpdatedEventData(id, changeSet, affected) {
	assert.string(id, 'id');
	assert.number(affected, 'affected');
	assert.optionalObject(changeSet, 'changeSet');

	Object.defineProperties(this, {
		/**
		 * @member {string} id The updated model's Id on the underlying data store.
		 *
		 * @memberOf UpdatedEventData
		 * @instance
		 */
		id: {
			value: id,
			enumerable: true
		},

		/**
		 * @member {number} affected The number of affected data models (either 0 or 1).
		 *
		 * @memberOf UpdatedEventData
		 * @instance
		 */
		affected: {
			value: affected,
			enumerable: true
		},

		/**
		 * @member {object} changeSet An object that describes the changes that were made.
		 *
		 * @memberOf UpdatedEventData
		 * @instance
		 */
		changeSet: {
			value: changeSet,
			enumerable: true
		}

	});
}

module.exports = UpdatedEventData;