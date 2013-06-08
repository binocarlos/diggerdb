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
    tools = require('./tools');


module.exports = function append(collection_factory){

  return function(append_query, promise){
    var self = this;

    collection_factory(append_query.req, function(error, collection){

      function assignTreeEncodings(diggerdata){

        var encodings = self.encode(diggerdata.diggerpath);
          
        //diggerdata.left_encodings = encodings.left;
        //diggerdata.right_encodings = encodings.right;

        diggerdata.left = tools.getEncodingValue(encodings.left.numerator, encodings.left.denominator);
        diggerdata.right = tools.getEncodingValue(encodings.right.numerator, encodings.right.denominator);
      }


      // assigns the links needed to add one container to another - recursivly down the tree
      function cascadeInsert(collection, data, parent_data, finishedcallback){

        data._id = data._digger.diggerid;

        /*
        
          this means we are appending to the top of the database
          
        */
        if(!parent_data){

          tools.getNextRootPosition(collection, function(error, next_root_position){

            data._digger.diggerpath = [next_root_position];
            data._digger.rootposition = next_root_position;

            assignTreeEncodings(data._digger);

            tools.insertContainer(collection, data, function(error){

              async.forEach(data._children || [], function(child_data, next_child){
                
                cascadeInsert(collection, child_data, data, next_child);
                
              }, function(error){

                finishedcallback(error, data);
              })

            })


          })
        }
        else{

          parent_data._digger.next_child_position = parent_data._digger.next_child_position || 0;
          parent_data._digger.next_child_position++;
          
          data._digger.diggerpath = parent_data._digger.diggerpath.concat([parent_data._digger.next_child_position]);
          data._digger.diggerparentid = parent_data._digger.diggerid;

          assignTreeEncodings(data._digger);

          tools.updateContainer(collection, parent_data, function(){

            tools.insertContainer(collection, data, function(){

              async.forEach(data._children || [], function(child_data, next_child){
                cascadeInsert(collection, child_data, data, next_child);
              }, function(error){

                finishedcallback(error, data);
              })

            })
          })
        }
      }

      var parent_data = append_query.target;
      var results = [];

      /*
      
        run through each of the appending containers and insert them into the DB
        
      */
      async.forEachSeries(append_query.body || [], function(data, next_data){

        cascadeInsert(collection, data, parent_data, function(error){

          if(!error){
            results = results.concat(data);  
          }

          next_data(error);

        })

      }, function(error){


        if(error){
          promise.reject(error);
        }
        else{
          promise.resolve(results);
        }
        
      })
    })
  }
}