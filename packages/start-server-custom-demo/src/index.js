console.log('started ' + process.pid + '!!');
setInterval(() => console.log('running ' + process.pid), 1000);
console.log(require('./value').default);

module.hot.accept('./value', () => {
  console.log(require('./value').default);
});
