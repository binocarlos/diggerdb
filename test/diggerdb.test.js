
var digger = require('digger.io');
var diggerdb = require('../src');
var data = require('./fixtures/data');
var async = require('async');
var fs = require('fs');

describe('diggerdb', function(){

	it('should throw an error with no collection given', function(done) {
		try{
			var db = diggerdb();
		} catch(e){
			done();
		}
		
	})

	it('should create with default connection details', function(done) {		
		var db = diggerdb({
			collection:'test'
		})
		
		db.settings.attr('hostname').should.equal('127.0.0.1');
		db.settings.attr('port').should.equal(27017);

		done();
		
	})

	it('should insert test data', function(done){
		
		var data = require(__dirname + '/fixtures/data').simplexml;
		var datac = digger.container(data);

		var db = diggerdb({
			collection:'test'
		})

		var container = digger.supplychain(db);

		container('product.onsale[price<100]')
			.ship(function(results){
				console.dir(results.toJSON());
			})
	})


})