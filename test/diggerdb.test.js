
var digger = require('digger.io');
var Bridge = require('digger-bridge');
var diggerdb = require('../src');
var XML = require('digger-xml');
var data = require('./fixtures/data');
var async = require('async');
var fs = require('fs');
var DB = require('../src/db');

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

	it('should reset the database with a reset option given', function(done){

		this.timeout(2000);

		var db = diggerdb({
			collection:'test',
			reset:true
		})

		var supplychain1 = Bridge(db).connect();

		function getdata(){
			var data = [{
				name:'Red',
				height:343
			},{
				name:'Blue',
				height:346
			},{
				name:'Yellow',
				height:8378
			}]

			var container = Bridge.container(data);
			container.tag('color');

			return container;
		}

		supplychain1.append(getdata()).ship(function(){

			var db2 = diggerdb({
				collection:'test',
				reset:true
			})

			var supplychain2 = Bridge(db2).connect();

			supplychain2.append(getdata()).ship(function(){

				var db3 = diggerdb({
					collection:'test'
				})

				var supplychain3 = Bridge(db3).connect();

				supplychain3('color').ship(function(colors){
					colors.count().should.equal(3);
					colors.tag().should.equal('color');

					supplychain2('dfdf').ship(function(){
						done();	
					})
					

				})
			})


		})

		
		
	})

	it('should insert and find test data', function(done){
		
		this.timeout(2000);

		var data = XML.parse(require(__dirname + '/fixtures/data').simplexml);
		var datac = Bridge.container(data);

		var db = diggerdb({
			collection:'test',
			reset:true
		})

		var container = Bridge(db).connect();

		var simpleadd = Bridge.container('simple', {
			name:'test',
			height:34
		})

		container.append(simpleadd).ship(function(){
			container('simple').ship(function(items){
				items.count().should.equal(1);
				items.tag().should.equal('simple');
				items.attr('height').should.equal(34);
				done();
			})
		})

	})

	it('should insert and find big test data', function(done){
		
		this.timeout(2000);

		var data = XML.parse(require(__dirname + '/fixtures/data').citiesxml);
		var datac = Bridge.container(data);

		var db = diggerdb({
			collection:'test',
			reset:true
		})

		var container = Bridge(db).connect();

		container.append(datac).ship(function(){

			container('city.south').ship(function(cities){
				cities.count().should.equal(3);
				done();
			})
		})

	})

	it('should save', function(done){
		
		this.timeout(2000);

		var data = XML.parse(require(__dirname + '/fixtures/data').citiesxml);
		var datac = Bridge.container(data);

		var db = diggerdb({
			collection:'test',
			reset:true
		})

		var supplychain = Bridge(db);

		var container = supplychain.connect();

		container.append(datac).ship(function(){
			container('city.south').ship(function(cities){
				cities.count().should.equal(3);

				cities.eq(0).attr('testme', 'hello').save().ship(function(){

					container('city.south[testme=hello]').ship(function(cities){
						
						cities.count().should.equal(1);
						done();
					})
				})
			})
		})


	})

	it('should remove', function(done){
		
		this.timeout(2000);

		var data = XML.parse(require(__dirname + '/fixtures/data').citiesxml);
		var datac = Bridge.container(data);

		var db = diggerdb({
			collection:'test',
			reset:true
		})

		var container = Bridge(db).connect();

		container.append(datac).ship(function(){
			container('city.south').ship(function(cities){
				cities.count().should.equal(3);

				cities.eq(0).remove().ship(function(){

					container('city.south').ship(function(cities){
						
						cities.count().should.equal(2);
						done();
					})
				})
			})
		})
		

	})

	it('should load from within an already loaded container', function(done){
		
		this.timeout(2000);

		var data = XML.parse(require(__dirname + '/fixtures/data').citiesxml);
		var datac = Bridge.container(data);

		var db = diggerdb({
			collection:'test',
			reset:true
		})

		var container = Bridge(db).connect();

		container.append(datac).ship(function(){

			container('city.south').ship(function(cities){

				cities('area.poor').ship(function(results){
					results.count().should.equal(3);
					done();
				})

			})

		})

	})


	it('should load children based on the tree modifier', function(done){
		
		this.timeout(2000);

		var data = XML.parse(require(__dirname + '/fixtures/data').citiesxml);
		var datac = Bridge.container(data);

		var db = diggerdb({
			collection:'test',
			reset:true
		})

		var container = Bridge(db).connect();

		container.append(datac).ship(function(){

			container('city.south:tree').ship(function(cities){

				cities.count().should.equal(3);
				cities.find('area').count().should.equal(8);
				done();

			})

		})

	})

	it('should provision into a collection based on the path', function(done){
		
		this.timeout(2000);

		var data = XML.parse(require(__dirname + '/fixtures/data').citiesxml);
		var datac = Bridge.container(data);

		var db = diggerdb({
			provider:'collection',
			url:'/mongo',
			reset:true
		})

		var container = Bridge(db).connect('/mongo/testprovider');

		container.append(datac).ship(function(){

			container('city.south:tree').ship(function(cities){

				cities.count().should.equal(3);
				cities.find('area').count().should.equal(8);

				var details =  {
					hostname:'127.0.0.1',
					port:27017,
					database:'digger',
					collection:'testprovider',
					reset:false
				}

				DB(details, function(error, collection){
					var cursor = collection.find({
						'$and':[{
							'_digger.tag':'city'
						},{
							'_digger.class':'south'
						}]
					}, null, {})

					cursor.toArray(function(error, docs){
						docs.length.should.equal(3);
						done();
					})
				})

			})

		})

	})

	it('should provision into a database and collection based on the path', function(done){
		
		this.timeout(2000);
		
		var data = XML.parse(require(__dirname + '/fixtures/data').citiesxml);
		var datac = Bridge.container(data);

		var db = diggerdb({
			provider:'database',
			url:'/mongo',
			reset:true
		})

		var container = Bridge(db).connect('/mongo/testdb/testprovider');

		container.append(datac).ship(function(){

			container('city.south:tree').ship(function(cities){

				cities.count().should.equal(3);
				cities.find('area').count().should.equal(8);

				var details =  {
					hostname:'127.0.0.1',
					port:27017,
					database:'testdb',
					collection:'testprovider',
					reset:false
				}

				DB(details, function(error, collection){
					var cursor = collection.find({
						'$and':[{
							'_digger.tag':'city'
						},{
							'_digger.class':'south'
						}]
					}, null, {})

					cursor.toArray(function(error, docs){
						docs.length.should.equal(3);
						done();
					})
				})

			})

		})

	})

})