/*jshint expr: true*/
'use strict';

const chai = require('chai'),
	expect = chai.expect,
	assert = chai.assert,
	ValidationError = require('../lib/errors/ValidationError.js'),
	isvalid = require('../');

const commonTests = {
	type: function(type, validData, invalidData) {
		describe('type', function() {
			it(`should come back with an error if input is not a(n) ${type.name}.`, () => {
				return expect(isvalid(invalidData, type))
					.to.eventually.be.rejectedWith(ValidationError)
					.and.to.have.property('validator', 'type');
			});
			it(`should come back with no error if input is a(n) ${type.name}.`, () => {
				return expect(isvalid(validData, {
					type: type
				})).to.eventually.be.a(type.name);
			});
			describe('#errors', function() {
				it(`should come back with an error of custom message if input is not a(n) ${type.name}.`, () => {
					return expect(isvalid(invalidData, {
						type: type,
						errors: {
							type: 'Type custom error message.'
						}
					})).to.eventually.be.rejectedWith(ValidationError).and.has.property('message', 'Type custom error message.');
				});
			});
		});
	},
	required: function(type, validData) {
		describe('required', function() {
			it('should come back with an error if required and input is undefined.', () => {
				return expect(isvalid(undefined, {
					type: type,
					required: true
				})).to.eventually.be.rejectedWith(ValidationError).and.to.have.property('validator', 'required');
			});
			it('should come back with no error if required and input is present', () => {
				return expect(isvalid(validData, {
					type: type,
					required: true
				})).to.eventually.be.a(type.name);
			});
			describe('#errors', function() {
				it('should come back with an error with custom message if required and input is undefined.', () => {
					return expect(isvalid(undefined, {
						type: type,
						required: true,
						errors: {
							required: 'Required custom error message.'
						}
					})).to.eventually.be.rejectedWith(ValidationError).and.has.property('message', 'Required custom error message.');
				});
			});
		});
	},
	allowNull: function(type) {
		describe('allowNull', function() {
			it('should come back with an error if required and does not allow null and input is null.', () => {
				return expect(isvalid(null, {
					type: type,
					required: true
				})).to.eventually.be.rejectedWith(ValidationError).and.to.have.property('validator', 'allowNull');
			});
			it('should come back with no error if required and allows null and input is null.', () => {
				return expect(isvalid(null, {
					type: type,
					required: true,
					allowNull: true
				})).to.eventually.be.null;
			});
			describe('#errors', function() {
				it('should come back with an error with custom message if required and does not allow null and input is null.', () => {
					expect(isvalid(null, {
						type: type,
						required: true,
						errors: {
							allowNull: 'Allow null custom error message.'
						}
					})).to.eventually.be.rejectedWith(ValidationError).and.has.property('message', 'Allow null custom error message.');
				});
			});
		});
	},
	default: function(type, validData) {
		describe('default', function() {
			it('should call default if default is function and returns a promise (async function).', () => {
				return expect(isvalid(undefined, { type: type, default: async () => {
					return validData;
				}})).to.eventually.be.a(type.name);
			});
			it('should call default if default is a function.', () => {
				return expect(isvalid(undefined, { type: type, default: () => {
					return validData;
				}})).to.eventually.be.a(type.name);
			});
			it('should call default if default is a value.', () => {
				return expect(isvalid(undefined, { type: type, default: validData })).to.eventually.be.a(type.name);
			});
		});
	},
	equal: function(type, validData, invalidData) {
		describe('equal', function()  {
			it('should come back with data if data is equal.', () => {
				return expect(isvalid(validData, {
					equal: validData
				})).to.eventually.equal(validData);
			});
			it('should come back with error if data does not equal.', () => {
				return expect(isvalid(invalidData, {
					equal: validData
				})).to.eventually.be.rejectedWith(ValidationError).and.to.have.property('validator', 'equal');
			});
		});
	},
	custom: function() {
		describe('custom', function() {
			it('should call function if custom is specified.', () => {
				return expect(isvalid('test', {
					custom: function(data) {
						expect(data).to.be.a('String').equals('test');
						return 'test2';
					}
				})).to.eventually.be.a('String').equals('test2');
			});
			it('should call function if synchronous custom is specified.', () => {
				return expect(isvalid(undefined, {
					custom: function() {
						return 'test';
					}
				})).to.eventually.be.a('String').equal('test');
			});
			it('should convert errors thrown in synchronous custom function.', () => {
				return expect(isvalid('test', {
					custom: function() {
						throw new Error('an error');
					}
				})).to.eventually.be.rejectedWith(ValidationError).and.has.property('message', 'an error');
			});
			it('should return original object if synchronous function doesn\'t return.', () => {
				return expect(isvalid('test', {
					custom: function() {}
				})).to.eventually.be.a('String').equal('test');
			});
			it('should reformat err if custom is specified and returns an error.', () => {
				return expect(isvalid({}, {
					custom: function(obj, schema, fn) {
						fn(new Error('This is an error'));
					}
				})).to.eventually.be.rejectedWith(ValidationError).and.has.property('validator', 'custom');
			});
			it('should pass on custom schema options if specified.', () => {
				return expect(isvalid({}, {
					custom: function(obj, schema, options) {
						expect(options).to.have.property('test').to.be.equal(true);
					}
				}, {
					test: true
				})).to.not.be.rejected;
			});
			it('should first validate using validators and then custom.', () => {
				let s = isvalid({
					'low': 0
				}, {
					type: Object,
					schema: {
						'low': { type: Number },
						'high': { type: Number, default: 10 },
					},
					custom: function(obj) {
						expect(obj.high).to.equal(10);
					}
				});
				return Promise.all([
					expect(s).to.eventually.have.property('low').equal(0),
					expect(s).to.eventually.have.property('high').equal(10)
				]);
			});
			it('should call all custom validators in array.', () => {
				return expect(isvalid(0, {
					custom: [
						function(data) {
							return data + 1;
						},
						function(data) {
							return Promise.resolve(data + 2);
						},
						function(data) {
							return data + 3;
						},
						function(data) {
							return Promise.resolve(data + 4);
						}
					]
				})).to.eventually.equal(10);
			});
			it('should come back with error if thrown underway.', () => {
				return expect(isvalid(0, {
					custom: [
						function(data) {
							return data + 1;
						},
						function() {
							throw new Error('Stop here');
						},
						function(data) {
							assert(false, 'This custom function should not have been called.');
							return data + 3;
						}
					]
				})).to.eventually.be.rejectedWith(ValidationError).and.have.property('validator', 'custom');
			});
		});
	},
	all: function(type, validData, invalidData) { var self = this;
		['type', 'required', 'allowNull', 'default', 'equal', 'custom'].forEach(function(test) {
			self[test](type, validData, invalidData);
		});
	}
};

describe('validate', function() {
	it('should throw an error if schema is not provided.', () => {
		return expect(isvalid({})).to.eventually.be.rejectedWith(Error);
	});
	describe('type conversion', function() {
		it('should convert string values into numbers if string contains a number.', () => {
			return expect(isvalid('123.987', Number)).to.eventually.equal(123.987);
		});
		it('should convert string values into numbers if string contains a negative number.', () => {
			return expect(isvalid('-123.987', Number)).to.eventually.equal(-123.987);
		});
		it('should come back with error if string is supplied - but not a number.', () => {
			return expect(isvalid('abc', Number))
				.to.eventually.be.rejectedWith(ValidationError)
				.and.to.have.property('validator', 'type');
		});
		it('should come back with no error and validData set to true if input is string with \'True\'.', () => {
			return expect(isvalid('True', Boolean)).to.eventually.equal(true);
		});
		it('should come back with no error and validData set to false if input is string with \'False\'.', () => {
			return expect(isvalid('False', Boolean)).to.eventually.equal(false);
		});
		it('should come back with error and if string is supplied - but not \'true\' or \'false\'.', () => {
			return expect(isvalid('123', Boolean))
				.to.eventually.be.rejectedWith(ValidationError)
				.and.to.have.property('validator', 'type');
		});
		it('should come back with no error and validData set to a Date if input is string with an ISO date.', () => {
			return expect(
				isvalid('2014-10-19T02:24:42.395Z', Date)
					.then((date) => {
						return date.getTime();
					})
			).to.eventually.equal(new Date('2014-10-19T02:24:42.395Z').getTime());
		});
		it('should come back with error and if string is supplied - but not ISO date.', () => {
			return expect(isvalid('19/10/14 2:24:42', Date))
				.to.eventually.be.rejectedWith(ValidationError)
				.and.to.have.property('validator', 'type');
		});
	});
	describe('object validator', function() {
		commonTests.all(Object, {}, 123);
		it('should come out with same input as output if keys can validate.', () => {
			let s = isvalid({
				awesome: true,
				why: 'it just is!'
			}, {
				awesome: Boolean,
				why: String
			});
			return Promise.all([
				expect(s).to.eventually.have.property('awesome').equals(true),
				expect(s).to.eventually.have.property('why').equals('it just is!')
			]);
		});
		it('should come back with no error and validData if object shortcut is empty.', () => {
			return expect(isvalid({}, {})).to.eventually.be.an('Object');
		});
		describe('unknownKeys', function() {
			it('should come back with unknown keys intact if unknownKeys is \'allow\'.', () => {
				return expect(isvalid({
					awesome: true,
					why: 'it just is!'
				}, {
					type: Object,
					unknownKeys: 'allow',
					schema: {
						awesome: Boolean
					}
				})).to.eventually.have.property('why').equals('it just is!');
			});
			it('should come back with unknown keys intact if unknownKeys is provided as \'allow\' in options defaults.', () => {
				return expect(isvalid({
					awesome: true,
					why: 'it just is!'
				}, {
					awesome: Boolean
				}, {
					defaults: {
						unknownKeys: 'allow'
					}
				})).to.eventually.have.property('why').equals('it just is!');
			});
			it('should come back with error if there are unknown keys and unknownKeys is not set.', () => {
				return expect(isvalid({
					awesome: true,
					why: 'it just is!'
				}, {
					awesome: Boolean
				})).to.eventually.be.rejectedWith(ValidationError).and.has.property('validator', 'unknownKeys');
			});
			it('should come back with error if there are unknown keys and unknownKeys is set to \'deny\'.', () => {
				return expect(isvalid({
					awesome: true,
					why: 'it just is!'
				}, {
					type: Object,
					unknownKeys: 'deny',
					schema: {
						awesome: Boolean
					}
				})).to.eventually.be.rejectedWith(ValidationError).and.has.property('validator', 'unknownKeys');
			});
			it('should come back with keys removed if unknown keys and unknownKeys is set to \'remove\'.', () => {
				return expect(isvalid({
					awesome: true,
					why: 'it just is!'
				}, {
					type: Object,
					unknownKeys: 'remove',
					schema: {
						awesome: Boolean
					}
				})).to.eventually.not.have.property('why');
			});
			describe('#errors', function() {
				it('should come back with error of custom message if there are unknown keys and unknownKeys is set to \'deny\'.', () => {
					return expect(isvalid({
						awesome: true,
						why: 'it just is!'
					}, {
						type: Object,
						unknownKeys: 'deny',
						schema: {
							awesome: Boolean
						},
						errors: {
							unknownKeys: 'Not allowed.'
						}
					})).to.eventually.be.rejectedWith(ValidationError).and.have.property('message', 'Not allowed.');
				});
			});
		});
	});
	describe('array validator', function() {
		commonTests.all(Array, [], 123);
		it('should come out with same input as output if array can validate.', () => {
			let s = isvalid([{
				awesome: true,
				why: 'it just is!'
			}], [{
				awesome: Boolean,
				why: String
			}]);
			return Promise.all([
				expect(s).to.eventually.be.an('Array').of.length(1),
				expect(s).to.eventually.to.have.property(0).and.to.have.property('awesome').equals(true),
				expect(s).to.eventually.to.have.property(0).and.to.have.property('why').equals('it just is!')
			]);
		});
		it('should come back with no error and an empty array when supplying empty array.', () => {
			return expect(isvalid([], [{}])).to.eventually.have.length(0);
		});
		describe('len', function() {
			it('should come back with same input as output if within ranges of len.', () => {
				return expect(isvalid([1,2], {
					type: Array,
					len: '2-',
					schema: Number
				})).to.eventually.be.an('Array').of.length(2);
			});
			it('should come back with error if array length is not within ranges of len.', () => {
				return expect(isvalid([], {
					type: Array,
					len: '2-',
					schema: {}
				})).to.eventually.be.rejectedWith(ValidationError).and.have.property('validator', 'len');
			});
			describe('#errors', function() {
				it('should come back with error of custom message if array length is not within ranges of len.', () => {
					return expect(isvalid([], {
						type: Array,
						len: '2-',
						schema: {},
						errors: {
							len: 'Not within range.'
						}
					})).to.eventually.be.rejectedWith(ValidationError).and.have.property('message', 'Not within range.');
				});
			});
		});
		describe('unique', function() {
			it('should come back with error if array of objects is not unique.', () => {
				return expect(isvalid([{
					awesome: true
				},{
					awesome: true
				}], {
					type: Array,
					unique: true,
					schema: { awesome: Boolean }
				})).to.eventually.be.rejectedWith(ValidationError).and.have.property('validator', 'unique');
			});
			it('should come back with no error if array of strings is unique.', () => {
				return expect(isvalid(['This', 'is', 'an', 'array'], {
					type: Array,
					unique: true,
					schema: String
				})).to.eventually.have.length(4);
			});
			describe('#errors', function() {
				it('should come back with error of custom message if array of objects is not unique.', () => {
					return expect(isvalid([{
						awesome: true
					},{
						awesome: true
					}], {
						type: Array,
						unique: true,
						schema: { awesome: Boolean },
						errors: {
							unique: 'Not a set.'
						}
					})).to.eventually.be.rejectedWith(ValidationError).and.to.have.property('message', 'Not a set.');
				});
			});
			describe('autowrap', function() {
				it('should come back with non-array wrapped in array', () => {
					return expect(isvalid({
						test: true
					}, {
						type: Array,
						autowrap: true,
						schema: {
							test: Boolean
						}
					})).to.eventually.be.an('array').and.to.have.property(0).and.to.have.property('test', true);
				});
				it('should come back with type error if autowrap and not matching subschema.', () => {
					return expect(isvalid({
						test: 'Not a boolean'
					}, {
						type: Array,
						autowrap: true,
						schema: {
							test: Boolean
						}
					})).to.eventually.be.rejectedWith(ValidationError).and.have.property('validator', 'type');
				});
				it('should come back with type error if no autowrap and matching subschema.', () => {
					return expect(isvalid({
						test: true
					}, [{
						test: Boolean
					}])).to.eventually.be.rejectedWith(ValidationError).and.have.property('validator', 'type');
				});
			});
		});
	});
	describe('string validator', function() {
		commonTests.all(String, 'string', 123);
		it('should come back with no error and input same as output if string is supplied.', () => {
			return expect(isvalid('123', String)).to.eventually.be.a('String').equals('123');
		});
		describe('trim', function() {
			it('should come back with trimmed string when trim is set to true.', () => {
				return expect(isvalid('\t123abc   ', { type: String, trim: true }))
					.to.eventually.equal('123abc');
			});
			it('should come back with trimmed string when trim option is true.', () => {
				return expect(isvalid('\t123abc   ', String, { defaults: { trim: true }}))
					.to.eventually.equal('123abc');
			});
			it('should come back with the string untrimmed if trim is not specified', () => {
				return expect(isvalid('\t123abc   ', String))
					.to.eventually.equal('\t123abc   ');
			});
		});
		describe('match', function() {
			it('should come back with an error if string does not match RegExp.', () => {
				return expect(isvalid('123', { type: String, match: /^[a-z]+$/ }))
					.to.eventually.be.rejectedWith(ValidationError)
					.and.to.have.property('validator', 'match');
			});
			it('should come back with no error and validData should match input string when match is specified and input matches.', () => {
				return expect(isvalid('123', { type: String, match: /^[0-9]+$/ }))
					.to.eventually.equal('123');
			});
			describe('#errors', function() {
				it('should come back with an error of custom message if string does not match RegExp.', () => {
					return expect(isvalid('123', {
						type: String,
						match: /^[a-z]+$/,
						errors: {
							match: 'Must be a string of letters from a to z.'
						}
					})).to.eventually.be.rejectedWith(ValidationError).and.have.property('message', 'Must be a string of letters from a to z.');
				});
			});
		});
		describe('enum', function() {
			it('should come back with an error if string is not in enum.', () => {
				return expect(isvalid('123', { type: String, enum: ['this','is','a','test'] }))
					.to.eventually.be.rejectedWith(ValidationError)
					.and.have.property('validator', 'enum');
			});
			it('should come back with no error if string is in enum.', () => {
				return expect(isvalid('test', { type: String, enum: ['this','is','a','test'] }))
					.to.eventually.be.a('String').equal('test');
			});
			describe('#errors', function() {
				it('should come back with an error of custom message if string is not in enum.', () => {
					return expect(isvalid('123', {
						type: String,
						enum: ['this','is','a','test'],
						errors: {
							enum: 'Must be a word from the sentence "this is a test".'
						}
					})).to.eventually.be.rejectedWith(ValidationError).and.have.property('message', 'Must be a word from the sentence "this is a test".');
				});
			});
		});
	});
	describe('number validator', function() {
		commonTests.all(Number, 123, []);
		it('should come back with no error and input same as output if number is supplied.', () => {
			return expect(isvalid(123, Number))
				.to.eventually.equal(123);
		});
		describe('range', function() {
			it('should come back with error if input is not within range.', () => {
				return expect(isvalid(1, { type: Number, range: '2-4' }))
					.to.eventually.be.rejectedWith(ValidationError)
					.and.to.have.property('validator', 'range');
			});
			it('should come back with no error and output same as input if within range.', () => {
				return expect(isvalid(3, { type: Number, range: '2-4' }))
					.to.eventually.equal(3);
			});
			describe('#errors', function() {
				it('should come back with error of custom message if input is not within range.', () => {
					return expect(isvalid(1, {
						type: Number,
						range: '2-4',
						errors: {
							range: 'Must be between 2 and 4.'
						}
					})).to.eventually.be.rejectedWith(ValidationError).and.to.have.property('message', 'Must be between 2 and 4.');
				});
			});
		});
	});
	describe('date validator', function() {
		commonTests.all(Date, new Date(), 123);
	});
});
