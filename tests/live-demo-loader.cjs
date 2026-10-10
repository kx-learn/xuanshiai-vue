const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
module.exports = function loadDemoEnvironment() {
  const root = path.resolve(__dirname, '..'), cache = new Map(), calls = [];
  const uni = {
    getStorageSync: () => '',
    request: () => { calls.push('request'); throw new Error('Demo must not request HTTP'); },
    connectSocket: () => { calls.push('socket'); throw new Error('Demo must not connect sockets'); },
    setStorageSync: () => { calls.push('storage'); throw new Error('Demo must not write identity'); },
  };
  function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = babel.transformSync(fs.readFileSync(file, 'utf8'), { filename: file, babelrc: false, configFile: false,
      plugins: [[require('@babel/plugin-transform-typescript'), { allExtensions: true }], require('@babel/plugin-transform-modules-commonjs')] }).code;
    vm.runInNewContext('(function(require,module,exports){' + code + '\n})', { uni, console, Date, Math, JSON, setTimeout, clearTimeout })
      (id => load(id.startsWith('@/') ? id.slice(2) : path.relative(root, path.resolve(path.dirname(file), id))), module, module.exports);
    return module.exports;
  }
  return { load, calls };
};
