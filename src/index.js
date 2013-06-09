/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var _ = require('lodash');
var async = require('async');

var mongodb = require('mongodb');
var digger = require('digger.io');

module.exports = factory;

var Select = require('./select');
var Append = require('./append');
var Save = require('./save');
var Remove = require('./remove');

/*

  we keep a single database connection per address details
  and spawn a collection from it each time
  
*/
var servers = {};
var databases = {};
var collections = {};

function get_mongo_server(details, callback){
  var server = servers[details.hostname + ':' + details.port];

  if(server){
    callback(null, server);
    return;
  }

  server = new mongodb.Server(details.hostname, details.port, {});
  servers[details.hostname + ':' + details.port] = server;
  callback(null, server);
}

function get_mongo_database(details, callback){

  var database = databases[details.hostname + ':' + details.port + ':' + details.database];

  if(database){
    callback(null, database);
    return;
  }

  get_mongo_server(details, function(error, server){
    if(error){
      throw new Error(error);
    }

    new mongodb.Db(details.database, server, {w: 1}).open(function(error, database){
      if(error){
        throw new Error(error);
      }
      
      databases[details.hostname + ':' + details.port + ':' + details.database] = database;  
      callback(error, database);
    });
  })
}

function get_mongo_collection(details, callback){
  var collection = collections[details.hostname + ':' + details.port + ':' + details.database + ':' + details.collection];

  if(collection && !details.reset){
    callback(null, collection);
    return;
  }

  get_mongo_database(details, function(error, database){

    var collection = new mongodb.Collection(database, details.collection);

    /*
    
      this needs to be better
      
    */
    collection.mapreduce = function(map_reduce_options, map_reduce_callback){

      map_reduce_options = _.extend({}, map_reduce_options);

      var mapReduce = {
        mapreduce: details.collection, 
        out:  { inline : 1 },
        query: map_reduce_options.query,
        map: map_reduce_options.map ? map_reduce_options.map.toString() : null,
        reduce: map_reduce_options.reduce ? map_reduce_options.reduce.toString() : null,
        finalize: map_reduce_options.finalize ? map_reduce_options.finalize.toString() : null
      }

      database.executeDbCommand(mapReduce, function(err, dbres) {

        var results = dbres.documents[0].results

        map_reduce_callback(err, results);
      })
    }

    collections[details.hostname + ':' + details.port + ':' + details.database + ':' + details.collection] = collection;

    if(details.reset){
      details.reset = false;
      collection.drop(function(){
        callback(null, collection);
      })
    }
    else{
      callback(null, collection);  
    }
    
  })
}

function factory(options){

  options = _.defaults(options, {
    hostname:'127.0.0.1',
    port:27017,
    database:'digger',
    collection:'test',
    reset:false
  })
  
  var supplier = digger.suppliers.nestedset(options);

  var routes = [];
  if(options.provider==='database'){
    routes = ['database', 'collection'];
  }
  else if(options.provider==='collection'){
    routes = ['collection'];
  }

  if(routes.length>0){
    supplier.provision(routes, function(routes, callback){
      callback();
    })  
  }
  

  var hostname = supplier.settings.attr('hostname');
  var port = supplier.settings.attr('port');
  var reset = supplier.settings.attr('reset');

  function collection_factory(req, callback){

    var useoptions = _.clone(options);

    if(req.getHeader('x-json-resource')){
      useoptions = _.extend(useoptions, req.getHeader('x-json-resource'));
    }

    get_mongo_collection(useoptions, function(error, collection){
      if(options.reset){
        options.reset = false;
      }
      callback(error, collection);
    });

  }
  
  supplier.select(Select(collection_factory));
  supplier.append(Append(collection_factory));
  supplier.save(Save(collection_factory));
  supplier.remove(Remove(collection_factory));

  return supplier;
}