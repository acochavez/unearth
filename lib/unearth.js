// process.storage = {},
var set = function (attr, val, line, file_path) {
	var data = {},
		d = new Date();

	if (!process.unearth_cache) {
		process.unearth_cache = [];
	}
	if (!attr || !line) {
		return false;
	}

	data.attr 	= attr;
	data.val 	= val;
	data.line	= line;
	data.file_path	= file_path;
	data.created_at = d.getTime();
	process.unearth_cache.unshift(data);

	return;
};

var fs = require('fs'),
	async = require('async'),
	esprima = require('esprima'),
	jsp = require('uglify-js').parser,
	new_require = function (filename) {
		var node_modules = ['%NODE_MODULES%'];
		if (~node_modules.indexOf(filename)) {
			old_require(filename);
		} else {
			old_require(filename + '-unearth')
		}
	},

	REQ_OVERRIDE = 'process.storage = {}; process.storage.set = ' + set + '; var old_require = require; require = ' + new_require + ';',

	writeLogs = function (toWrite, lines, fpath) {
		for (var i in toWrite) {
			//Format is: variable name, value, line number
			var lineNum = (toWrite[i][3] || 0) - 1;

      if (!lines[lineNum])
        continue;

      var semiColonIdx = lines[lineNum].lastIndexOf(';');
      
      lines[lineNum] = lines[lineNum].substring(0, semiColonIdx + 1) + 
                      'process.storage.set('+toWrite[i][0] + ',' + toWrite[i][1] + ',' + toWrite[i][2] + ',"' + fpath + '");' +
                      lines[lineNum].substr(semiColonIdx + 1);
			}

			return lines;
		},

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

					callback(null, REQ_OVERRIDE.replace('\'%NODE_MODULES%\'', NODE_MODULES.toString()));
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
					merged = [],
					resultArr,
					withLogs,

					dream_catcher = function (a, parent) {
						var results = [],
							temp2 = [],
							temp,
							end;

						if (!a) {
							return results;
						}

						end = a.loc && a.loc.end.line;

						a.parent = parent;
						a.end = end;
						a.been_there = true;

						//console.log(a);
						//console.log(a.type);

						switch (a.type) {
							case 'Program' :
							case 'BlockStatement' :
								results = results.concat(a.body.map(function (b) {
									return dream_catcher(b, a);
								}));
								break;

							case 'BinaryExpression' :
							case 'LogicalExpression' :
							case 'AssignmentExpression' :
								results = results.concat(dream_catcher(a.left, a));
								results = results.concat(dream_catcher(a.right, a));
								break;

							case 'MemberExpression' :
								temp = a.object;
								while (temp) {
									results = results.concat(dream_catcher(temp, a));
									if (temp.type === 'MemberExpression') {
										temp2.unshift(temp.property.name);
									}
									else {
										temp2.unshift(temp.name);
									}
									temp = temp.object;
								}
								temp2.push(a.property.name);
								a.property.name = temp2.join('.');
								results = results.concat(dream_catcher(a.property, a));
								break;

							case 'SwitchCase' :
								results = results.concat(a.consequent.map(function (b) {
									return dream_catcher(b, a);
								}));
								break;

							case 'SwitchStatement' :
								results = results.concat(a.cases.map(function (b) {
									return dream_catcher(b, a);
								}));
								break;
							case 'UpdateExpression' :
								results = results.concat(dream_catcher(a.argument, a));
								break;

							case 'NewExpression' :
								results = results.concat(dream_catcher(a.callee, a));
								results = results.concat(a.arguments.map(function (b) {
									return dream_catcher(b, a);
								}));
								break;

							case 'ForStatement' :
								results = results.concat(dream_catcher(a.init));
								results = results.concat(dream_catcher(a.test.left));
								results = results.concat(dream_catcher(a.test.right));
								results = results.concat(dream_catcher(a.update));
								results = results.concat(dream_catcher(a.body));
								break;
							case 'CatchClause' :
								results = results.concat(dream_catcher(a.param));
								results = results.concat(dream_catcher(a.body));
								break;

							case 'TryStatement' :
								results = results.concat(dream_catcher(a.block));
								results = results.concat(a.handlers.map(function (b) {
									return dream_catcher(b, a);
								}));
								break;

							case 'UnaryExpression' :
								results = results.concat(dream_catcher(a.argument));
								break;

							case 'ForInStatement' :
								results = results.concat(dream_catcher(a.left));
								results = results.concat(dream_catcher(a.right));
								results = results.concat(dream_catcher(a.body));
								break;

							case 'WhileStatement' :
								results = results.concat(dream_catcher(a.test.left));
								results = results.concat(dream_catcher(a.test.right));
								results = results.concat(dream_catcher(a.body));
								break;

							case 'ThrowStatement' :
								results = results.concat(dream_catcher(a.argument));
								break;

							case 'ReturnStatement' :
								if (a.argument) {
									results = results.concat(dream_catcher(a.argument, a));
								}
								break;

							case 'SequenceExpression' :
								results = results.concat(a.expressions.map(function (b) {
									return dream_catcher(b, a);
								}));
								break;

							case 'ArrayExpression' :
								results = results.concat(a.elements.map(function (b) {
									return dream_catcher(b, a);
								}));
								break;

							case 'ExpressionStatement' :
								results = results.concat(dream_catcher(a.expression, a));
								break;

							case 'ConditionalExpression' :
							case 'IfStatement' :
								results = results.concat(dream_catcher(a.test, a));
								results = results.concat(dream_catcher(a.consequent, a));
								if (a.alternate) {
									results = results.concat(dream_catcher(a.alternate, a));
								}
								break;

							case 'DoWhileStatement' :
								results = results.concat(dream_catcher(a.test, a));
								results = results.concat(dream_catcher(a.body, a));
								break;

							case 'FunctionExpression' :
							case 'FunctionDeclaration' :
								results = results.concat(dream_catcher(a.body, a));
								break;

							case 'Property'	:
								results = results.concat(dream_catcher(a.value, a));
								break;

							case 'ObjectExpression' :
								results = results.concat(a.properties.map(function (b) {
									return dream_catcher(b, a);
								}));
								break;

							case 'VariableDeclaration' :
								results = results.concat(a.declarations.map(function (b) {
									return dream_catcher(b, a);
								}));
								break;

							case 'VariableDeclarator' :
								results = results.concat(dream_catcher(a.id, a));
								results = results.concat(dream_catcher(a.init, a));
								break;

							case 'CallExpression' :
								results = results.concat(dream_catcher(a.callee, a));
								results = results.concat(a.arguments.map(function (b) {
									return dream_catcher(b, a);
								}));
								break;

							case 'Identifier' :
								var temp;
								temp = a.parent;
								console.log(temp);
								while (temp && (
									temp.type === 'ObjectExpression'
									|| temp.type === 'Property'
									|| temp.type === 'VariableDeclarator'
									|| temp.type === 'ArrayExpression'
									|| temp.type === 'AssignmentExpression'
									|| temp.type === 'SequenceExpression')) {
									console.log(temp.type);
									end = temp.end;
									temp = temp.parent;
								}
								results = results.concat([['"' + a.name + '"', a.name, a.loc.start.line, end]]);
								break;

							case 'Literal' :
							case 'ThisExpression' :
							case 'BreakStatement' :
							case 'ContinueStatement' :
								break;

							default :

								console.log(a.type);
								console.log(a);
								process.exit();
						}

						return results;
					},

					flatten = function flatten(arr) {
						return arr.reduce(function (flat, toFlatten) {
							if (toFlatten.some(Array.isArray)) {
								return flat.concat(flatten(toFlatten));
							} else {
								return flat.concat(toFlatten);
							}
						}, []);
					},

					split = function (a, n) {
						var len = a.length,
							out = [],
							i = 0,
							size;
						while (i < len) {
							size = Math.ceil((len - i) / n--);
							out.push(a.slice(i, i += size));
						}
						return out;
					};

				a = flatten(dream_catcher(parsed, null));
				a = split(a, a.length / 4);
				a = a.filter(function(elem, pos) {
				    return a.indexOf(elem) === pos;
				});

				data = writeLogs(a, data.split('\n'), filepath);
				callback(null, REQ_OVERRIDE + data.join('\n'));
			}],

			rewriteFile: ['modifyFile', function (callback, cbres) {
				var data = cbres.modifyFile,
					temp = filepath.split('.'),
					ext = temp.pop(),
					newFilePath = temp.join('.') + '-unearth' + '.' + ext;

				fs.writeFile(newFilePath, data, function (err) {
					callback(err, newFilePath);
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
