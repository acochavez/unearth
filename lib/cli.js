/*
	Commandline interface for Unearth.js

	Usage:
	var cli = require(__dirname + "/lib/cli");

	// do all the other stuff here

	// initialize the cli after all the files are loaded
	cli.init();	
	
*/



var readline = require('readline'),
	sift = require("sift"),
	clc = require('cli-color'),
	rl = readline.createInterface(process.stdin, process.stdout),
	log = function (sq, p, v, ln, fp, t, opt) {
		var pr = '',
			vl = '',
			f  = '',
			time = '',
			tm = new Date(t);

		if (!p || !ln) {
			console.log(clc.red('UNEARTH ERROR: ') + clc.greenBright('Invalid arguments for unearth logger.'));
			return false;
		}

		pr = clc.green(p);
		vl = clc.green( get_type(v));	 		
	 	
	 	if (opt.show_file) {
			f = '\t\t' + clc.cyan.underline(fp);
		}
		if (opt.show_time) {
			time = '\n\t\t\t\t\t' + clc.cyan.underline(tm.toUTCString());
		}
		console.log( ('\tLine ' + ln + ': \t' + pr + ' = ' + vl + f + time).replace(sq, clc.red(sq))); 
		return false;

	},
	get_type = function (val) {

		switch (typeof val) {
			case 'undefined' :
				return 'Undefined';
				break;

			case 'object' :
				return JSON.stringify(val);
				break;

			default : 
				return val;
				break;
		}

	},
	search_cache  = function (search_query) {
		var query = {},
			result;
		if (!search_query) {
			return false;
		}

		result = sift( 
			{ $or : [ 	{attr : new RegExp(search_query, "gi") }, 
						{val : new RegExp(search_query, "gi") }] }, 
			process.unearth_cache);
		result.sort(function (a, b) {
			return b.created_at - a.created_at;
		});

		return result;
	},
	showhelp = function() {
		console.log(clc.white('\n\n\t\tUNEARTH.JS Command Tools'));
		console.log(clc.cyan('--reset') + '\t\tResets the variable cache. This will erase all the existing values and variables in our cache' );
		console.log(clc.cyan('--burrow') + '\tKills unearth process. Stops the debug session.' );
		console.log(clc.cyan('--timestamp-on') + '\tShows the time when the variable is generated' );
		console.log(clc.cyan('--timestamp-off') + '\tHides the time when the varibale is generated' );
		console.log(clc.cyan('--showsource') + '\tDisplays the source file of the variable' );
		console.log(clc.cyan('--hidesource') + '\tHides the source file of the variable' );
		console.log(clc.cyan('--burrow') + '\tKills unearth process. Stops the debug session.' );

	};

exports.init = function () {
	var rs,
		hdr = clc.white('\n~unearth>'),
		options = {
			show_time: false,
			show_file: true
		};

	console.log('\nStarting ' + clc.white.bold('unearth.js') + '...');
	console.log(hdr + ' Loading custom logger files');
	console.log(hdr + ' Loading variable caches');
	console.log(hdr + ' Cheking available potatoes and soda cans\n\n');
	console.log(clc.white('\t\tUNEARTH.JS Initialized'));
	console.log(clc.white('Unearth.js is a tool to debug and display variable values on runtime.\nNo need for console.logs!'));
	console.log(clc.white('Once running, just type the any value or variable that you want to search.'));
	console.log(clc.white('For the list of commands, just type: ') + clc.cyan('--help') + '\n\n');
	rl.setPrompt(hdr);
	rl.prompt();

	rl.on('line', function(line) {

		switch(line) {
			case '--burrow' :
				rl.close();
				break;

			case '--help' :
				showhelp();
				break;

			case '--timestamp-off' :
				options.show_time = false;
				break;

			case '--timestamp-on' :
				options.show_time = true;
				break;

			case '--showsource' :
				options.show_file = true;
				break;
	
			case '--hidesource' :
				options.show_file = false;
				break;


			default :
				rs = search_cache(line);
				if(line.trim() !== '') {
					if (rs && rs.length === 0) {
						console.log(clc.redBright('~unearth>') + '\t\tNo matches found for query');
					} else { 
						rs.forEach(function (a) {
							log(line, a.attr, a.val, a.line, a.file_path, a.created_at, options);
						});
					}
				}

		}

	    rl.prompt();
	}).on('close',function(){
	    process.exit(0);
	});
}