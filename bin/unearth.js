'use strict';

var index = require('../lib/index');
var cli = require('../lib/cli');

var start = function () {
  if (!process.argv[2]) {
    return console.log('File is missing');
  }

  index.unearthing(process.argv[2], function(error, result){
    if (error)
      return console.log('Error Unearthing...' + JSON.stringify(error));

    console.log('Successfully Unearthed App...');

    cli.init();
  });
};

start();