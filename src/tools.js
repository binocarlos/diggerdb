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

var _ = require('lodash'),
    async = require('async'),
    bigint = require('bigint');

module.exports = {
  getNextRootPosition:getNextRootPosition,
  getEncodingValue:getEncodingValue,
  insertContainer:insertContainer,
  updateContainer:updateContainer,
  removeContainer:removeContainer
}

// get the next available position index for this container
function getNextRootPosition(collection, callback){
  var options = {
    query:{
      '_digger.diggerparentid':null
    },
    map:function(){
      emit('position', this._digger.rootposition);
    },
    reduce:function(k,v){
      var max = 0;
      v.forEach(function(vv){
        max = vv>max ? vv : max;
      })
      return max;
    }
  }

  /*
  
    a total hack when we are in dev mode it dosn't like 2 at the same time
    
  */
  setTimeout(function(){
    collection.mapreduce(options, function(error, results){
    
      var result = results && results.length>0 ? results[0] : {
        value:0
      }

      callback(error, result.value + 1);
    })  
  }, Math.round(Math.random()*20))
}

function getPaddedNumber(num){

  return '' + num + '00000000000000000000000000000000';
  
}

function getEncodingValue(top, bottom){

  var fixedLength = 36;

  top = bigint(getPaddedNumber(top));
  bottom = bigint(bottom);

  var answer = top.div(bottom).toString();

  while(answer.length<fixedLength){
    answer = '0' + answer;
  }

  return answer;
}

function insertContainer(collection, data, callback){  
  
  var raw = _.clone(data);
  delete(raw._children);
  delete(raw._data);

  collection.insert(raw, {safe:true}, callback);

}

function updateContainer(collection, data, callback){  

  var raw = _.clone(data);
  delete(raw._children);
  delete(raw._data);

  collection.update({
    '_digger.diggerid':data._digger.diggerid
  }, raw, {safe:true}, callback)

}

function removeContainer(collection, data, callback){
  
  collection.remove({
    '$and':[
      {
        '_digger.left':{
          '$gte':data._digger.left
        }
      },
      {
        '_digger.right':{
          '$lte':data._digger.right
        }
      }
    ]
  }, {safe:true}, callback)
}