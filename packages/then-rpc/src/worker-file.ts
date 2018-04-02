const fname: string = process.argv[2];
let modu: any = require(fname);

process.on('message', async message => {
  try {
    const result = await Promise.resolve(
      new Function('mod,ctx', 'return (' + message.fn + ')(mod, ctx);')(
        modu,
        message.context,
      ),
    );
    if (message.kind === 'run') {
      process.send!({resolve: true, value: result});
    } else {
      modu = result;
      process.send!({resolve: true, value: undefined});
    }
  } catch (ex) {
    process.send!({
      resolve: false,
      value: {message: ex.message, stack: ex.stack},
    });
  }
});
