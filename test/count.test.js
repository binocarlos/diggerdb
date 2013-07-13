
var digger = require('digger.io');
var diggerdb = require('../src');
var data = require('./fixtures/data');
var async = require('async');
var fs = require('fs');
var DB = require('../src/db');

describe('diggerdb:count', function(){


	it('should return the count', function(done){
		
		this.timeout(2000);

		var data = require(__dirname + '/fixtures/data').citiesxml;
		var datac = digger.container(data);

		var db = diggerdb({
			collection:'test',
			reset:true
		})

		var supplychain = digger.supplychain(db);

		supplychain.append(datac).ship(function(){
			var container = digger.supplychain(db);

			container('city:count').ship(function(results){
				results.attr('count').should.equal(8);
				done();
			})	
		})

	})

})