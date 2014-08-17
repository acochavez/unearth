var async = require('async');
var dir = require('node-dir');
var fs = require('fs');
var unearth = require(__dirname + '/unearth');

unearthing = function (scriptFile, cb) {

    async.auto({
        listFiles: function(callback){
            console.log('CWD: '+process.cwd());
            dir.files(process.cwd(), callback);
        },

        processFiles: ['listFiles', function(callback, cbres){
            var files = cbres.listFiles;

            async.map(files, 
                function(filePath, next){
                    //Unearth only js files, exclude unearthed files and everything under node_modules
                    if (((/.js$/).test(filePath)) && (!(/.*-unearth.*/).test(filePath)) && (!(/.*node_modules.*/).test(filePath))) {
                        unearth.init(filePath, next);
                    } else {
                        next(null);
                    }
                }
            , callback);
        }],

        runApp: ['processFiles', function(callback, cbres){
            //Add -unearth to filename
            var temp = scriptFile.split('.'),
                ext = temp.pop(),
                filename = temp.join('.') + '-unearth' + '.' + ext;

                var newFiles = (cbres.processFiles).filter(function(a){ return (a != undefined)});
                for (var i in newFiles)
                    require(newFiles[i]);

                callback(null);
        }],

        cleanUp: ['runApp', function(callback, cbres){
            var newFiles = (cbres.processFiles).filter(function(a){ return (a != undefined)});
            //callback(null);
            async.map(newFiles, fs.unlink, callback);
        }]
    }, cb);
}

module.exports = {
    unearthing: unearthing
}