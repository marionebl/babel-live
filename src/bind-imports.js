import * as t from 'babel-types';
import traverse from 'babel-traverse';
import merge from 'lodash.merge';

function detective(input) {
  const dependencies = [];
  const ast = merge({}, input);

  traverse(ast, {
    VariableDeclarator(path) {
      const init = path.node.init;
      const identifier = path.node.id;
      const isCallExpression = t.isCallExpression(init);

      const isRequireCall = isCallExpression &&
        init.callee.name === 'require';

      const isStaticRequireCall = isRequireCall &&
        init.arguments.length === 1 &&
        t.isStringLiteral(init.arguments[0]);

      // like: var foo = require('./bar');
      if (isStaticRequireCall) {
        const sourceName = init.arguments[0].value;
        // Only work on local requires
        if (sourceName[0] !== '.') {
          return;
        }

        dependencies.push({
          specifierName: identifier.name,
          sourceName: sourceName,
          path: path,
          type: 'default'
        });
      }
    }
  });

  return dependencies;
}

export default function bindImports(input) {
  const ast = merge({}, input);
  const dependencies = detective(ast);
  
  traverse(ast, {
    Program(path) {
      const containerPath = path.scope.generateUidIdentifier('modules');

      const properties = dependencies.map(dependency => {
        const {specifierName} = dependency;
        const init = dependency.path.node.init;

        dependency.path.remove();
        dependency.path.scope.rename(specifierName, `${containerPath.name}.${specifierName}`);

        return t.objectMethod(
          'get',
          t.identifier(specifierName),
          [],
          t.BlockStatement([
            t.returnStatement(init)
          ])
        )
      });

      if (properties.length > 0) {
        const modules = t.objectExpression(properties);
        const modulesDeclaration = t.VariableDeclaration('const', [
          t.VariableDeclarator(
            containerPath,
            modules
          )
        ]);
        path.node.body.unshift(modulesDeclaration);
      }
    }
  });

  return ast;
}
