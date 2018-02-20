import chalk from 'chalk';
import {sync as mkdirp} from 'mkdirp';
import {basename} from 'path';
import Generator = require('yeoman-generator');

const pkg = require('../../package.json');

interface Options {
  name?: string;
  ownerName?: string;
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
  props: {[key: string]: string} = {
    ...versions,
    year: '' + new Date().getFullYear(),
  };
  options: Options;
  constructor(args: string | string[], options: Options) {
    super(args, options);
    this.options = options;

    this.argument('name', {type: String, required: false});
  }
  async prompting() {
    // Have Yeoman greet the user.
    this.log('Welcome to ' + chalk.red('moped:library') + '!');

    if (this.options.name) {
      this.props.name = this.options.name;
    } else {
      const {name} = await this.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Your library name',
          default: basename(process.cwd()),
        },
      ]);
      this.props.name = name;
    }
    if (this.options.ownerName) {
      this.props.ownerName = this.options.ownerName;
    } else {
      const {ownerName} = await this.prompt([
        {
          type: 'input',
          name: 'ownerName',
          message: 'Your GitHub user name',
          default: 'ForbesLindesay',
        },
      ]);
      this.props.ownerName = ownerName;
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
      const dir = this.destinationPath(name);
      mkdirp(dir);
      this.destinationRoot(dir);
      process.chdir(dir);
    }
  }

  writeOutput() {
    this.fs.copy(
      this.templatePath('.prettierrc'),
      this.destinationPath('.prettierrc'),
    );
    this.fs.copy(
      this.templatePath('.travis.yml'),
      this.destinationPath('.travis.yml'),
    );
    this.fs.copy(
      this.templatePath('gitignore'),
      this.destinationPath('.gitignore'),
    );
    this.fs.copy(this.templatePath('LICENSE'), this.destinationPath('LICENSE'));
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
      this.templatePath('src/index.ts'),
      this.destinationPath('src/index.ts'),
    );
    mkdirp(this.destinationPath('src/__tests__'));
    this.fs.copy(
      this.templatePath('src/__tests__/index.test.ts'),
      this.destinationPath('src/__tests__/index.test.ts'),
    );
  }
  async install() {
    await this.yarnInstall();
  }
};
