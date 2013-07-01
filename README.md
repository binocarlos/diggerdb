diggerdb
========

MongoDB tree database for digger.io

```js
var digger = require('digger.io');
var diggerdb = require('diggerdb');

// this will route the path onto the collection
// so /db/stuff1 -> collection = 'stuff1'
var db = diggerdb({
	database:'dbname',
	provider:'collection',
	url:'/db'
})

```