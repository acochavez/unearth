var fs = require('fs'),
	async = require('async'),
	esprima = require('esprima'),
	logger = require('./logger'),
	jsp = require('uglify-js').parser,



	new_require = function (filename) {
		var node_modules = [NODE_MODULES];
		if (~node_modules.indexOf(filename)) {
			old_require(filename);
		} else {
			old_require(filename + '-unearth')
		}
	},

	REQ_OVERRIDE = 'process.agent_p = []; var old_require = require; require = ' + new_require,

	init = function  (filepath, cb) {
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

			checkSemiColon: ['readFile', function (callback, cbres) {
				var data = cbres.readFile;

				try {
					jsp.parse(data, {strict_semicolons: true});
					callback(null);
				} catch (err) {
					console.log('Error at line: ' + err.line + 'File Path: ' + filepath);
				}
			}],

			getNodeModules : function (callback) {
				require('child_process').exec('npm ls --json', function (err, stdout, stderr) {
					if (err || !stdout) {
						return callback('Error: ' + JSON.stringify(err) + '\nOutput: ' + JSON.stringify(stdout));
					}

					NODE_MODULES = JSON.parse(stdout)['dependencies'];

					NODE_MODULES = (NODE_MODULES && typeof NODE_MODULES === 'object')
						? Object.keys(NODE_MODULES)
						: [];

					callback(null, REQ_OVERRIDE.replace('%NODE_MODULES%', NODE_MODULES.toString()));
				});
			},

			modifyFile : ['checkSemiColon', 'getNodeModules', function (callback, cbres) {
				var data = cbres.readFile,
					parsed = esprima.parse(data, {loc: true}),
					lines = data.split('\n'),
					vars = [],
					str = '',
					lineNum,
					order,
					temp,

					body_parser = function (body) {
						return body.map(function (a) {
							var end;
								console.log(a.type)
							switch (a.type) {
								case 'ExpressionStatement' :
									end =  expression_parser(a.expression);
									break;
								case 'IfStatement' :
									end = body_parser(a.consequent.body);
									break;
								case 'FunctionExpression' :
									end = body_parser(a.body.body);
									break;
								case 'VariableDeclaration' :
									end = variable_parser(a.declarations);
									break;
								default :
									console.log(a.type)
									process.exit();
							}

							end = end.filter(function (a) {
								return a || typeof a !== 'undefined';
							});

							return end;
						});
					},

					variable_parser = function (declarations) {
						return declarations.map(function (a) {
							switch (a.type) {
								case 'VariableDeclarator' :
									//Parse values further

									return ['"' + a.id.name + '"', a.init.value, a.init.loc.end.line]
								default :
									console.log('ravenjohn', a.type);
									process.exit();
							}
						});
					},

					expression_parser = function (a) {
						switch (a.type) {
							case 'AssignmentExpression' :
								return assignment_parser(a);
							case 'CallExpression' :
								return a.arguments.map(call_parser);
							default :
								console.log('asdfadf', a.type);
								process.exit();
						}
					},

					call_parser = function (a) {
						switch (a.type) {
							case 'AssignmentExpression' :
								return assignment_parser(a);
							case 'ExpressionStatement' :
								return  expression_parser(a);
							case 'ThisExpression' :
								console.log(a);
								return [];
							default :
								console.log('2asdfadf', a.type);
								process.exit();
						}
					},

					assignment_parser = function (a) {
						var left = [],
							right = [];

						switch (a.left.type) {
							case 'Identifier' :
								// console.log(3, a);
								left = [['"' + a.left.name + '"', a.left.name, a.left.loc.end.line]];
								break;
							default :
								console.log('here', a.type);
								process.exit();
						}

						console.log(a.right.type);
						switch (a.right.type) {
							case 'ObjectExpression' :
								right = object_parser(a.right);
								break;
							case 'AssignmentExpression' :
								// console.log(2, a.right);
								right = assignment_parser(a.right);
								break;
							case 'FunctionExpression' :
								right = body_parser(a.right.body.body);
								break;
							case 'Literal' :
								break;
							default :
								console.log('asghyyy', a.type);
								process.exit();
						}
						return left.concat(right);
					},

					object_parser = function (a) {
						var end = a.loc.end.line;
						// console.log('raven gwapo');
						return a.properties.map(function (b) {
							// console.log(b.value.type);
							switch (b.value.type) {
								case 'FunctionExpression' :
									// console.log('asdfasdf');
									// console.log(b);
									return body_parser(b.value.body.body);
								case 'Identifier' :
									// console.log(4, b);
									return ['"' + b.value.name + '"', b.value.name, end];
								default :
									console.log(' vb b vb v', a.type);
									process.exit();
							}
						});
					};

				// console.log(JSON.stringify(
					//console.log(parsed.body)
					a = body_parser(parsed.body);
					console.log(a);


					console.log(JSON.stringify(a));
				// ));

				callback(null, lines.join('\n'));
			}],

			rewriteFile: ['modifyFile', function (callback, cbres) {
				var data = cbres.modifyFile,
					temp = filepath.split('.'),
					ext = temp.pop(),
					newFilePath = temp.join('.') + '-unearth' + '.' + ext;

				fs.writeFile(newFilePath, data, function (err) {
					callback(err
						? 'Error: ' + JSON.stringify(err)
						: (null, newFilePath));
				});
			}]
		},

		function (error, result) {
			if (error) {
				console.log(error);
				cb(error);
			} else {
				cb(null, result.rewriteFile);
			}
		});

	};

module.exports = {
	init: init
};
