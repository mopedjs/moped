const filename: string = process.argv[2];
let mod: any = require(filename);

process.on('message', async message => {
  try {
    const result = await Promise.resolve(
      new Function('mod,ctx', 'return (' + message.fn + ')(mod, ctx);')(
        mod,
        message.context,
      ),
    );
    if (message.kind === 'run') {
      process.send!({resolve: true, value: result});
    } else {
      mod = result;
      process.send!({resolve: true, value: undefined});
    }
  } catch (ex) {
    process.send!({
      resolve: false,
      value: {message: ex.message, stack: ex.stack},
    });
  }
});
