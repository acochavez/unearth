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

	start = function () {
		if (!process.argv[2]) {
		  return console.log('File is missing');
		}

		init(process.argv[2]);
	},

	init = function  (filepath) {
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
					//console.log('Error: ' + JSON.stringify(err));
					callback('Meaningful something at line ' + err.line);
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
								console.log(a);
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
								if (a.parent && (
									a.parent.type === 'ObjectExpression'
									|| a.parent.type === 'VariableDeclarator'
									|| a.parent.type === 'ArrayExpression'
									|| a.parent.type === 'SequenceExpression')) {
									end = a.parent.end;
								}
								results = results.concat([['"' + a.name + '"', a.name, end]]);
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
				a = split(a, a.length/3);

				// console.log(JSON.stringify(a));

				// build string

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
						: null);
				});
			}]
		},

		function (error, result) {
			if (error) {
				console.log(error);
				process.exit(1);
			} else {
				console.log('Successfully unearthed app. :)');
			}
		});

	};

start();
