'use strict';

var assert = require('assert-plus');

/**
 * Encapsulates data related to a {@link MongoRepo#deleted} event.
 * @class
 *
 * @param id The deleted model's Id on the underlying data store.
 * @param {number} affected The number of affected models (either 0 or 1).
 *
 */
function DeletedEventData(id, affected) {
	assert.ok(id, 'id');
	assert.number(affected, 'affected');

	Object.defineProperties(this, {
		/**
		 * @member id The deleted model's Id on the underlying data store.
		 * @memberOf DeletedEventData
		 * @instance
		 */
		id: {
			value: id,
			enumerable: true
		},

		/**
		 * @member {number} affected The number of affected data models (either 0 or 1).
		 *
		 * @memberOf DeletedEventData
		 * @instance
		 */
		affected: {
			value: affected,
			enumerable: true
		}

	});
}

module.exports = DeletedEventData;
