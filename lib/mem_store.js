/*
	Simple memory storage unearth

	Sample usage

	var storage = require(__dirname + "/lib/mem_store");
	
	// inserting value
	storage.set(attribute_name, value, line_number, file_path);

	// fetching a value
	storage.get(search_query)
*/


var sift = require("sift");

exports.set = function (attr, val, line, file_path) {
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
}

exports.get = function (search_query) {
	var query = {},
		result;
	if (!search_query) {
		return false;
	}

	result = sift( 
		{ $or : [ {attr : search_query}, {val : search_query}] }, 
		process.unearth_cache);
	result.sort(function (a, b) {
		return b.created_at - a.created_at;
	});

	return result;
}