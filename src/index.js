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
var digger = require('digger.io');
var mongodb = require('mongodb');

module.exports = factory;

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
      supplier.collection = new mongodb.Collection(client, options.collection);
      finished();
    })
  })

  var hostname = supplier.settings.attr('hostname');
  var port = supplier.settings.attr('port');
  var reset = supplier.settings.attr('reset');

  function buildsupplier(){

    /*
    

      ----------------------------------------------
      SELECT
      ----------------------------------------------
      
    */
    supplier.select(function(select_query, promise){

      

      //promise.resolve(results.toJSON());
    })

    /*
    
      ----------------------------------------------
      APPEND
      ----------------------------------------------
      
    */
    supplier.append(function(append_query, promise){

      console.log('-------------------------------------------');
      console.dir(append_query);
      process.exit();
/*
      var append_to = append_query.target ? rootcontainer.spawn(append_query.target) : rootcontainer;
      var append_what = rootcontainer.spawn(append_query.body);

      if(!append_query.target){
       
        append_what.inject_paths([append_what.get_next_child_path_index()]);
      }
      else{

        var append_count = append_to.digger('append_count') || 0;

        append_what.inject_paths(([]).concat(append_to.diggerpath(), [append_count]))
        append_count++;

        append_to.digger('append_count', append_count);
      }

      append_what.diggerparentid(append_to.diggerid());
      append_to.append(append_what);

      supplier.savefile(function(error){
        if(error){
          promise.reject(error);
        }
        else{
          promise.resolve(append_what.toJSON());  
        }
      })
*/
    })

    /*
    
      ----------------------------------------------
      SAVE
      ----------------------------------------------
      
    */

    supplier.save(function(save_query, promise){

/*
      var data = save_query.body;

      _.each(data, function(val, key){
        save_query.target[key] = data[key];
      })

      supplier.savefile(function(error){
        if(error){
          promise.reject(error);
        }
        else{
          promise.resolve(data);  
        }
      })
*/

    })

    /*
    
      ----------------------------------------------
      REMOVE
      ----------------------------------------------
      
    */

    supplier.remove(function(remove_query, promise){

/*
      var target = rootcontainer.spawn(remove_query.target);
      var parent = rootcontainer;

      if(target.diggerparentid()){
        parent = rootcontainer.find('=' + target.diggerparentid());
      }

      parent.get(0)._children = _.filter(parent.get(0)._children, function(model){
        return model._digger.diggerid!=target.diggerid();
      })

      supplier.savefile(function(error){
        if(error){
          promise.reject(error);
        }
        else{
          promise.resolve();  
        }
      })

*/

    })

  }


  return supplier;
}