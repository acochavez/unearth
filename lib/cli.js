var readline = require('readline'),
	rl = readline.createInterface(process.stdin, process.stdout),
	storage = require(__dirname + "/../lib/mem_store"),
	logger = require(__dirname + "/../lib/logger"),
	clc = require('cli-color');



exports.init = function () {
	var rs;

	rl.setPrompt('Type a variable or value that you want to unearth: ');
	rl.prompt();

	rl.on('line', function(line) {
		rs = storage.get(line);
		if (!rs || rs.length === 0) {
			console.log(clc.red('UNEARTH ERROR: ') + 'No matches found for query');
		}
		rs.forEach(function (a) {
			logger.log(line, a.attr, a.val, a.line, a.file_path);
		});

	    rl.prompt();
	}).on('close',function(){
	    process.exit(0);
	});
}