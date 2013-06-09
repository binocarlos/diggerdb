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

var DB = require('./db');
var digger = require('digger.io');

module.exports = factory;

var Select = require('./select');
var Append = require('./append');
var Save = require('./save');
var Remove = require('./remove');

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

    DB(useoptions, function(error, collection){
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