import * as t from 'babel-types';
import traverse from 'babel-traverse';

export default function bindImports(ast) {
  let container;
  let dependencies = [];

  traverse(ast, {
    Program(path) {
       container = path.scope.generateUidIdentifier('modules');
    },
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
        const requirePath = init.arguments[0].value;
        // Only work on local requires
        if (requirePath[0] !== '.') {
          return;
        }
        
        dependencies.push({
          name: identifier.name,
          path: requirePath,
          init: init
        });

        path.remove();
        path.scope.rename(identifier.name, `${container.name}.${identifier.name}`);
      }
    }
  });
  
  traverse(ast, {
    Program(path) {
      const properties = dependencies.map(dependency => {
        return t.objectMethod(
          'get',
          t.identifier(dependency.name),
          [],
          t.BlockStatement([
            t.returnStatement(dependency.init)
          ])
        )
      });
      if (properties.length > 0) {
        const modules = t.objectExpression(properties);
        const modulesDeclaration = t.VariableDeclaration('const', [
          t.VariableDeclarator(
            container,
            modules
          )
        ]);
        path.node.body.unshift(modulesDeclaration);
      }
    }
  });

  return ast;
}
