var storage = require(__dirname + "/lib/mem_store");



storage.set('ninz',{sample:23243},300, 'sample');
storage.set('ninz2',23123123,300, 'sample');
storage.set('ninz3',23123123,300, 'sample');
storage.set('ninz4',23123123,300, 'sample');
storage.set('ninz5',23123123,300, 'sample');
storage.set('ninz6',23123123,300, 'sample');
console.log('adsasdasdasdasdasdasd');
storage.set('ninz7',23123123,300, 'sample');
storage.set('ninz8',23123123,300, 'sample');
storage.set('ninz9',23123123,300, 'sample');
storage.set('ninz10',23123123,300, 'sample');
storage.set('ninz10','ninz2',300, 'sample');

console.log(storage.get('ninz2'));