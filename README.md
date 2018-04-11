# yarn-logical-tree
[![Build Status](https://travis-ci.org/imsnif/yarn-logical-tree.svg?branch=master)](https://travis-ci.org/imsnif/yarn-logical-tree) [![Coverage Status](https://coveralls.io/repos/github/imsnif/yarn-logical-tree/badge.svg?branch=master)](https://coveralls.io/github/imsnif/synp?branch=master) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)    
This package is a wrapper to get[`npm-logical-tree`](https://github.com/npm/npm-logical-tree) working with a `yarn.lock` file - most code and tests are taken from that package. The API is the same except for `address` (and consequently `path`) which is not implemented (if you need `path` / `address` - issues/PRs are very much welcome!)

## Install

`npm install yarn-logical-tree` / 
`yarn add yarn-logical-tree`

## Example

```javascript
const fs = require('fs')
const lockfile = require('@yarnpkg/lockfile')
const yarnLogicalTree = require('yarn-logical-tree')

const packagePath = '/path/to/package'
const pkg = fs.readFileSync(`${packagePath}/package.json`, 'utf-8')
const yarnLock = fs.readFileSync(`${packagePath}/yarn.lock`, 'utf-8')

const yarnLockParsed = lockfile.parse(yarnLock)
const pkgParsed = JSON.parse(pkg)
yarnLogicalTree(pkgParsed, yarnLockParsed.object)

// returns:
LogicalTree {
  name: 'some-package',
  version: '1.0.0',
  address: null,
  optional: false,
  dev: false,
  bundled: false,
  resolved: undefined,
  integrity: undefined,
  requiredBy: Set { },
  dependencies:
   Map {
     'foo' => LogicalTree {
       name: 'foo',
       version: '1.2.3',
       address: 'foo',
       optional: false,
       dev: true,
       bundled: false,
       resolved: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
       integrity: 'sha1-rYUK/p261/SXByi0suR/7Rw4chw=',
       dependencies: Map { ... },
       requiredBy: Set { ... },
     },
     ...
  }
}
```

## License
MIT
