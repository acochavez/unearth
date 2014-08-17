#!/usr/bin/env node
'use strict';

var unearth = require('../lib/index');

start = function () {
  if (!process.argv[2]) {
    return console.log('File is missing');
  }

  index(process.argv[2], function(error, result){
    if (error)
      return console.log('Error Unearthing...');

    console.log('Successfully Unearthed App...');
  });
}

start();