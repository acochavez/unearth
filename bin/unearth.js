#!/usr/bin/env node
'use strict';

var cli = require('../lib/cli');

//Process command line arguments
var options = cli.parse(process.argv);

//Run