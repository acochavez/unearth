/*
	Logger class Unearth.js

	Sample usage


	var logger = require(__dirname + "/logger");
	
	logger.log(variable_name, value, line_number, file_path);
		variable_name - the name of the variable, put is_searched if matched by query
		value - value of the variable, put is_searched if matched by query
		line_number - line number where the variable was found
		file_path (optional) - path of the file
	

	// Include a file path if you want to specify a certain filepath for the logs
	logger.log('username', {val: 'ninz.xp', is_searched:true }, 299, 'file://projects/node_lib/libs.js');
	
	// Put the search text into an object with 'val' as the value of the searched text and is_searched is true
	logger.log({val:'ninz.xp', is_searched:true}, undefined, 299 );
	
	// If there is no is_searched property, the logger will log the object as is
	logger.log({val:'ninz.xp', is_searched:true}, {val: 'ninz.xp', sample:true }, 299);
	
	// Coverts array and object to string
	logger.log('some_array', {val: { sample: [1,2,3,4,5]}, is_searched:true }, 299);
	

*/


var clc = require('cli-color'),
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

	};

exports.log = function (sq, p, v, ln, fp, t) {
	var pr = '',
		vl = '',
		f  = '';

	if (!p || !ln) {
		console.log(clc.red('UNEARTH ERROR: ') + clc.greenBright('Invalid arguments for unearth logger.'));
		return false;
	}

	pr = clc.green(p);
	vl = clc.green( get_type(v));	 		
 	
 	if (fp) {
		f = '\t\t' + clc.cyan.underline(fp);
	}
	console.log( (clc.bold('Line ' + ln + ': \t') + pr + ' = ' + vl + f ).replace(sq, clc.red(sq))); 
	return false;

}

exports.log_header = function (s, fp) {
	console.log('Found ' + clc.red(s) + ' on ' +  clc.underline(fp));
	return;
}