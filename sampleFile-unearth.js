var newRequire = require;
require = function (filename) {
	var NODE_MODULES = [express,request,cli-color,update-notifier,async,esprima,uglify-js,sift,node-dir,body-parser];
	if(NODE_MODULES.indexOf(filename)){
		newRequire(filename);
	} else {
		//Not a node module, append unearth
		newRequire(filename + '-unearth');
	}
}

if (true) {
  f = 3;console.log(f);
} else {
  g = 1;console.log(g);
}

var e = {
  a: 1,
  b: 2,
  c: 3,
  f: function () {
    g = 2;console.log(e);console.log(a);console.log(b);console.log(c);console.log(f);console.log(g);
  }
};