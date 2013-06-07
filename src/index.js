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
var clients = {};
function get_mongo_client(details, callback){
  var existing = clients[details.hostname + ':' + details.port];

  if(existing){
    callback(null, existing);
    return;
  }

  var server = new mongodb.Server(details.hostname, details.port, {});
  new mongodb.Db(details.database, server, {w: 1}).open(function(error, client){
    if(!error){
      clients[details.hostname + ':' + details.port] = client;  
    }
    callback(error, client);
  });
}

function factory(options){
  
  options = _.defaults(options, {
    hostname:'127.0.0.1',
    port:27017,
    database:'digger',
    reset:false
  })

  var supplier = digger.suppliers.nestedset(options);

  if(!supplier.settings.attr('collection')){
    throw new Error('collection required for diggerdb');
  }


  /*
  
    PREPARE CONNECTION
    
  */
  supplier.prepare(function(finished){
    get_mongo_client(options, function(error, client){
      if (error) throw error;

      var collection = supplier.collection = new mongodb.Collection(client, options.collection);

      /*
      
        this needs to be better
        
      */
      collection.mapreduce = function(map_reduce_options, callback){

        map_reduce_options = _.extend({}, map_reduce_options);

        var mapReduce = {
          mapreduce: options.collection, 
          out:  { inline : 1 },
          query: map_reduce_options.query,
          map: map_reduce_options.map ? map_reduce_options.map.toString() : null,
          reduce: map_reduce_options.reduce ? map_reduce_options.reduce.toString() : null,
          finalize: map_reduce_options.finalize ? map_reduce_options.finalize.toString() : null
        }

        client.executeDbCommand(mapReduce, function(err, dbres) {

          var results = dbres.documents[0].results

          callback(err, results);
        })
      }
      
      buildsupplier(supplier.collection);
      finished();
    })
  })

  var hostname = supplier.settings.attr('hostname');
  var port = supplier.settings.attr('port');
  var reset = supplier.settings.attr('reset');

  function buildsupplier(collection){

    supplier.select(Select(collection));
    supplier.append(Append(collection));
    supplier.save(Save(collection));
    supplier.remove(Remove(collection));

  }


  return supplier;
}