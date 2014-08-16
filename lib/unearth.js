var async = require('async');
var esprima = require('esprima');
var fs = require('fs');
var jsp = require('uglify-js').parser;
var logger = require('./logger');

var REQ_OVERRIDE = 'var newRequire = require;' +
                   '\nrequire = function (filename) {' +
                   '\n\tvar NODE_MODULES = [%NODE_MODULES%];' +
                   '\n\tif(NODE_MODULES.indexOf(filename)){' +
                   '\n\t\tnewRequire(filename);' +
                   '\n\t} else {' +
                   '\n\t\t//Not a node module, append unearth' +
                   '\n\t\tnewRequire(filename + \'-unearth\');' +
                   '\n\t}' +
                   '\n}\n\n'

function init (filepath) {
  var NODE_MODULES = {};

  var queue = [];

  async.auto({
    readFile: function (callback){
      fs.readFile(filepath, function(err, data) {
        if (err || !data) {
          callback('Error: ' + JSON.stringify(err) + '\nData: ' + data);
        } else {
          callback(null, data.toString());
        }
      });
    },

    checkSemiColon: ['readFile', function (callback, cbres){
      var data = cbres.readFile;

      try {
        jsp.parse(data, {strict_semicolons: true});
        callback(null);
      } catch (err) {
        console.log('Error: ' + JSON.stringify(err));
        callback(err);
      }
    }],

    getNodeModules: function (callback){
      require('child_process').exec('npm ls --json', function(err, stdout, stderr) {
        if (err || !stdout) {
          callback('Error: ' + JSON.stringify(err) + '\nOutput: ' + JSON.stringify(stdout));
        } else {
          NODE_MODULES = JSON.parse(stdout)['dependencies'];

          if (NODE_MODULES && (typeof NODE_MODULES == 'object')) {
            NODE_MODULES = Object.keys(NODE_MODULES);
          } else {
            NODE_MODULES = [];
          }

          callback(null, REQ_OVERRIDE.replace('%NODE_MODULES%', NODE_MODULES.toString()));
        }
      });
    },

    modifyFile: ['checkSemiColon', 'getNodeModules', function(callback, cbres){
      var data = cbres.readFile;
      var tokenized = esprima.tokenize(data, {loc: true});
      var fxnsToAppend = cbres.getNodeModules;

      var lines = data.split('\n');
      var vars = [];
      for (var i in tokenized) {
        if (tokenized[i]) {
          if (tokenized[i].type === 'Identifier') {
            if (vars.indexOf(tokenized[i].value) < 0)
              vars.push(tokenized[i].value);
          } else if (tokenized[i].type === 'Punctuator' && tokenized[i].value === ';') {
            //Append console logs
            var str = '';
            while(vars.length != 0) {
              str += 'console.log('+vars.shift()+');';
            }

            //Insert string right after semicolon
            var order = tokenized[i].loc.start.column;
            var lineNum = tokenized[i].loc.end.line - 1;
            
            lines[lineNum] = lines[lineNum].substring(0, order + 1) + str + lines[lineNum].substring(order + 1, lines[lineNum].length);

            vars = [];
          }
        } else {
          break;
        }
      }

      //Rejoin code
      data = lines.join('\n');

      //Append function override
      data = fxnsToAppend + data;

      callback(null, data);
    }],

    rewriteFile: ['modifyFile', function(callback, cbres){
      var data = cbres.modifyFile;

      var newFilePath = filepath.substring(0, filepath.lastIndexOf('.')) + '-unearth' + filepath.substring(filepath.lastIndexOf('.'), filepath.length);

      fs.writeFile(newFilePath, data, function (err) {
        if (err) {
          callback('Error: ' + JSON.stringify(err));
        } else {
          callback(null);
        }
      });
    }]
  }, function (error, result){
    if (error) {
      console.log(error);
      process.exit(1);
    } else {
      console.log('Successfully unearthed app. :)');
    }
  });
  
}

if (!process.argv[2]) {
  return console.log('File is missing');
}

init(process.argv[2]);
