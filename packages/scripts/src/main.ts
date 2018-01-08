import {prompt} from 'inquirer';

const CI = process.env.CI;
const isCI = CI && CI.toLowerCase() !== 'false';
const args = process.argv.slice(2);

async function run() {
  let script: string = args[0];
  if (!script && !isCI) {
    const {answer} = await prompt({
      name: 'answer',
      type: 'list',
      message: 'Which command would you like to run?',
      choices: [
        {
          name:
            'build - Build a production bundle ready to be deployed to heroku (or a node.js host of your choice).',
          value: 'build',
        },
        {
          name: 'db - Run operations to modify the database.',
          value: 'db',
        },
        {
          name: 'start - Start the server in development mode.',
          value: 'start',
        },
      ],
    });
    script = answer;
  }
  switch (script) {
    case 'build':
      await import('./scripts/build');
      break;
    case 'db':
      await import('./scripts/db');
      break;
    case 'start':
      await import('./scripts/start');
      break;
    // TODO: bicycle
    // TODO: init
    // TODO: test - js
    // TODO: test - e2e
    // TODO: install
    default:
      console.log('Unknown script "' + script + '".');
      process.exit(1);
  }
}
run().catch(ex => {
  console.error(ex);
  process.exit(1);
});
