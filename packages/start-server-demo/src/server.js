function server(req, res) {
  res.end('Hello World ' + process.pid);
}

export default server;
