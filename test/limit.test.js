
var digger = require('digger.io');
var diggerdb = require('../src');
var data = require('./fixtures/data');
var async = require('async');
var fs = require('fs');
var DB = require('../src/db');

describe('diggerdb', function(){


	it('should apply the limit', function(done){
		
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

			container('city:limit(3)').ship(function(results){
				results.count().should.equal(3);
				done();
			})	
		})

	})

})