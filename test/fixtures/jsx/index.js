const React = {
  createElement() {
    console.log('React.createElement called!');
  }
};

const Dependency = require('./dependency');

const jsx = <div><Dependency /></div>;
