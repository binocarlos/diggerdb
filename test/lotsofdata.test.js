
var digger = require('digger.io');
var diggerdb = require('../src');
var data = require('./fixtures/data');
var async = require('async');
var fs = require('fs');
var DB = require('../src/db');

describe('diggerdb', function(){

	it('should do lots of data and stay intact', function(testdone){
		
		/*
		
			30 seconds
			
		*/
		this.timeout(30 * 1000);
		
		var data = require(__dirname + '/fixtures/data').citiesxml;
		
		var db = diggerdb({
			database:'bigtest',
			collection:'bigtest',
			url:'/',
			reset:true
		})

		var dbcontainer = digger.supplychain('/', db);
		var rootcontainer = digger.create('folder');

		/*
		
			add X sets each with Y levels
			
		*/
		function createdata(){
			return digger.container(data);
		}

		function insertdata(sets, levels, alldone){
			

			var currentset = 0;

			async.whilst(
				function(){
					currentset++;
					return currentset<sets;
				},
				function(nextset){
					var currentlevel = 0;
					var lastcontainer = rootcontainer;

					async.whilst(
						function(){
							currentlevel++;
							return currentlevel<levels;
						},
						function(nextlevel){
							var appendcontainer = createdata();

							lastcontainer
								.append(appendcontainer)

							lastcontainer = appendcontainer.find('area[name=Meadows]');

							nextlevel();

						},
						nextset
					)
				},
				function(){

					dbcontainer
						.append(rootcontainer)
						.ship(function(){
							async.parallel({
								poor:function(done){
									dbcontainer('city.south area.poor').ship(function(areas){
										done(null, areas.count());
									})
								},
								rich:function(done){
									dbcontainer('city.north area.rich').ship(function(areas){
										done(null, areas.count());
									})
								}
							}, function(error, results){
								results.poor.should.equal(459);
								results.rich.should.equal(300);
								alldone();
							})
							
						})
					
					
				}
			)
		}
		
		insertdata(10, 10, testdone);
		
	})

})