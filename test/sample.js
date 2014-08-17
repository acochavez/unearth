var something = function () {
  if (true) {
    f = 3;
  } else {
    g = 1;
  }

  var e = {
    a: 1,
    b: 2,
    c: 3,
    f: function () {
      g = 2;
    }
  };
};

something();