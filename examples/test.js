var digger = require('digger.io');
var diggerdb = require('../src');

var data = require(__dirname + '/../test/fixtures/data').simplexml;
var datac = digger.container(data);

		var db = diggerdb({
			collection:'test',
			reset:true
		})

		var supplychain1 = digger.supplychain(db);

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

			var container = digger.create(data);
			container.tag('color');

			return container;
		}

		supplychain1.append(getdata()).ship(function(){

			var db2 = diggerdb({
				collection:'test',
				reset:true
			})

			var supplychain2 = digger.supplychain(db2);

			supplychain2.append(getdata()).ship(function(){

				var db3 = diggerdb({
					collection:'test'
				})

				var supplychain3 = digger.supplychain(db3);

				supplychain3('color').ship(function(colors){
					colors.count().should.equal(3);
					colors.tag().should.equal('color');

				})
			})


		})