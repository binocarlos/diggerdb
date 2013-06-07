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



module.exports = function append(mongoclient){
  return function(append_query, promise){
  	var self = this;

  	function assignTreeEncodings(data){

      var encodings = self.encode(data.diggerpath);
        
      meta.left_encodings = encodings.left;
      meta.right_encodings = encodings.right;

      meta.left = getEncodingValue(encodings.left.numerator, encodings.left.denominator);
      meta.right = getEncodingValue(encodings.right.numerator, encodings.right.denominator);
    }


    // assigns the links needed to add one container to another - recursivly down the tree
    function cascadeInsert(collection, data, parent_data, finishedcallback){

      data._id = data._digger.diggerid;

      /*
      
        this means we are appending to the top of the database
        
      */
      if(!parent_data){

        getNextRootPosition(collection, function(error, next_root_position){

          data._digger.diggerpath = [next_root_position];
          data._digger.rootposition = next_root_position;

          assignTreeEncodings(data._digger);

          insertContainer(collection, data, function(error){

            async.forEach(data._children || [], function(child_data, next_child){
              
              cascadeInsert(collection, child_data, data, next_child);
              
            }, function(error){

              finishedcallback(error, data);
            })

          })


        })
      }
      else{

        parent_data._digger.next_child_position || (parent_data._digger.next_child_position = 0);
        parent_data._digger.next_child_position++;
        
        data._digger.diggerpath = parent_data._digger.diggerpath.concat([parent_data._digger.next_child_position]);
        data.meta.parent_id = parent_data.meta.quarryid;

        assignTreeEncodings(data.meta);

        updateContainer(mongoclient, parent_data, function(){

          insertContainer(mongoclient, data, function(){

            async.forEach(data.children || [], function(child_data, next_child){
              cascadeInsert(mongoclient, child_data, data, next_child);
            }, function(error){

              finishedcallback(error, data);
            })

          })
        })
      }
    }
  }
}