import chalk from 'chalk';
import {sync as mkdirp} from 'mkdirp';
import {basename} from 'path';
import Generator = require('yeoman-generator');

const pkg = require('../../package.json');

interface Options {
  name?: string;
}
const versions: {[key: string]: string} = {};
Object.keys(pkg.dependencies).forEach(name => {
  versions['version_' + name.replace(/[^a-zA-Z]/g, '_')] =
    pkg.dependencies[name];
});
Object.keys(pkg.devDependencies).forEach(name => {
  versions['version_' + name.replace(/[^a-zA-Z]/g, '_')] =
    pkg.devDependencies[name];
});
module.exports = class MopedGenerator extends Generator {
  props: {[key: string]: string} = {...versions};
  options: Options;
  constructor(args: string | string[], options: {}) {
    super(args, options);

    this.argument('name', {type: String, required: false});
  }
  async prompting() {
    // Have Yeoman greet the user.
    this.log('Welcome to ' + chalk.red('moped') + '!');

    if (this.options.name) {
      this.props.name = this.options.name;
    } else {
      const {name} = await this.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Your app name (e.g. example.com)',
          default: basename(process.cwd()),
        },
      ]);
      this.props.name = name;
    }
  }

  directory() {
    const name = this.props.name;
    if (!name) {
      throw new Error('You must supply a name');
    }
    if (basename(this.destinationPath()) !== name) {
      this.log(
        'Your app must be inside a folder named ' +
          name +
          '\n' +
          "I'll automatically create this folder.",
      );
      mkdirp(name);
      this.destinationRoot(this.destinationPath(name));
    }
  }

  writeOutput() {
    this.fs.copyTpl(
      this.templatePath('.env'),
      this.destinationPath('.env'),
      this.props,
    );
    this.fs.copy(
      this.templatePath('gitignore'),
      this.destinationPath('.gitignore'),
    );
    this.fs.copy(
      this.templatePath('.prettierrc'),
      this.destinationPath('.prettierrc'),
    );
    this.fs.copyTpl(
      this.templatePath('package.json'),
      this.destinationPath('package.json'),
      this.props,
    );
    this.fs.copy(
      this.templatePath('tsconfig.json'),
      this.destinationPath('tsconfig.json'),
    );
    mkdirp(this.destinationPath('src'));
    this.fs.copy(
      this.templatePath('src/client.tsx'),
      this.destinationPath('src/client.tsx'),
    );
    this.fs.copy(
      this.templatePath('src/email.ts'),
      this.destinationPath('src/email.ts'),
    );
    this.fs.copyTpl(
      this.templatePath('src/index.html'),
      this.destinationPath('src/index.html'),
      this.props,
    );
    this.fs.copy(
      this.templatePath('src/server.dev.ts'),
      this.destinationPath('src/server.dev.ts'),
    );
    this.fs.copy(
      this.templatePath('src/server.prod.ts'),
      this.destinationPath('src/server.prod.ts'),
    );
    this.fs.copy(
      this.templatePath('src/server.tsx'),
      this.destinationPath('src/server.tsx'),
    );
    mkdirp(this.destinationPath('src/authentication'));
    this.fs.copy(
      this.templatePath('src/authentication/passwordless.ts'),
      this.destinationPath('src/authentication/passwordless.ts'),
    );
    mkdirp(this.destinationPath('src/bicycle-schema'));
    this.fs.copy(
      this.templatePath('src/bicycle-schema/BicycleContext.ts'),
      this.destinationPath('src/bicycle-schema/BicycleContext.ts'),
    );
    this.fs.copy(
      this.templatePath('src/bicycle-schema/Root.ts'),
      this.destinationPath('src/bicycle-schema/Root.ts'),
    );
    this.fs.copy(
      this.templatePath('src/bicycle-schema/User.ts'),
      this.destinationPath('src/bicycle-schema/User.ts'),
    );
    mkdirp(this.destinationPath('src/components'));
    this.fs.copy(
      this.templatePath('src/components/App.tsx'),
      this.destinationPath('src/components/App.tsx'),
    );
    this.fs.copy(
      this.templatePath('src/components/ErrorBoundary.tsx'),
      this.destinationPath('src/components/ErrorBoundary.tsx'),
    );
    this.fs.copy(
      this.templatePath('src/components/Home.tsx'),
      this.destinationPath('src/components/Home.tsx'),
    );
    this.fs.copy(
      this.templatePath('src/components/LoginPage.tsx'),
      this.destinationPath('src/components/LoginPage.tsx'),
    );
    this.fs.copy(
      this.templatePath('src/components/ProfilePage.tsx'),
      this.destinationPath('src/components/ProfilePage.tsx'),
    );
    mkdirp(this.destinationPath('src/db-migrations'));
    this.fs.copy(
      this.templatePath('src/db-migrations/00001-init.ts'),
      this.destinationPath('src/db-migrations/00001-init.ts'),
    );
    this.fs.copy(
      this.templatePath('src/db-connection.ts'),
      this.destinationPath('src/db-connection.ts'),
    );
    this.fs.copy(
      this.templatePath('src/db.ts'),
      this.destinationPath('src/db.ts'),
    );
    mkdirp(this.destinationPath('src/public'));
  }
  async install() {
    await this.yarnInstall();
  }
};
