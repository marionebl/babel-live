import 'babel-polyfill';

import path from 'path';
import {readFile} from 'mz/fs';

import denodeify from 'denodeify';
import meow from 'meow';
import resolveNodeback from 'resolve';
import merge from 'lodash.merge';
import omit from 'lodash.omit';
import rc from 'rcfile';
import findConfig from 'find-config';
import live from './';

const resolve = denodeify(resolveNodeback);

const cli = meow(`
  Usage
    $ babel-live [input] <args>

  Options
`);

async function getPackage() {
  try {
    const content = await readFile(path.resolve(process.cwd(), 'package.json'));
    return JSON.parse(content);
  } catch (error) {
    return {};
  }
}

async function main(input, flags) {
  if (!input) {
    const error = new Error('[input] module is required.');
    error.cli = true;
    throw error;
  }

  const basedir = process.cwd();

  const inputPath = await resolve(input, {basedir});
  const cwd = path.dirname(inputPath);

  const pkg = findConfig.read('package.json', {cwd});
  const rcOptions = rc('babel', {cwd});

  const options = merge({}, pkg.babel, rcOptions, flags.babel);
  return live(inputPath, flags, omit(options, ['_']));
}

main(cli.input[0], cli.flags)
  .catch(error => {
    if (error.cli) {
      console.error(error.message);
      return cli.showHelp(1);
    }
    setTimeout(() => {
      throw error;
    });
  });
