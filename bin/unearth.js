'use strict';

var index = require('../lib/index');

var start = function () {
  if (!process.argv[2]) {
    return console.log('File is missing');
  }

  index.unearthing(process.argv[2], function(error, result){
    if (error)
      return console.log('Error Unearthing...');

    console.log('Successfully Unearthed App...');
  });
};

start();