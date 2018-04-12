'use strict'

const test = require('tap').test

const yarnLogicalTree = require('../')

test('includes toplevel dependencies', t => {
  const pkg = {
    dependencies: {
      'a': '^1.0.0',
      'b': '^2.0.0'
    }
  }
  const yarnLock = {
    'a@^1.0.0': {
      version: '1.0.1'
    },
    'b@^2.0.0': {
      version: '2.0.2'
    }
  }
  const logicalTree = yarnLogicalTree(pkg, yarnLock)
  t.deepEqual(
    logicalTree.requiredBy,
    new Set(),
    'toplevel is not required'
  )

  t.ok(logicalTree.getDep('a'), 'dep a is there')
  t.equal(
    logicalTree.getDep('a').version,
    '1.0.1',
    'dep b has a version'
  )
  t.deepEqual(
    logicalTree.getDep('a').requiredBy,
    new Set([logicalTree]),
    'a is required by the root'
  )

  t.ok(logicalTree.getDep('b'), 'dep b is there')
  t.equal(
    logicalTree.getDep('b').version,
    '2.0.2',
    'dep b has a version'
  )
  t.deepEqual(
    logicalTree.getDep('b').requiredBy,
    new Set([logicalTree]),
    'dep b is required by root'
  )
  t.done()
})

test('includes transitive dependencies', t => {
  const pkg = {
    dependencies: {
      'a': '^1.0.0',
      'b': '^2.0.0'
    }
  }
  const yarnLock = {
    'a@^1.0.0': {
      version: '1.0.1',
      dependencies: {
        b: '^2.0.0',
        c: '^3.0.0'
      }
    },
    'b@^2.0.0': {
      version: '2.0.2'
    },
    'c@^3.0.0': {
      version: '3.0.3',
      dependencies: {
        b: '^2.0.0'
      }
    }
  }
  const logicalTree = yarnLogicalTree(pkg, yarnLock)
  const depA = logicalTree.getDep('a')
  const depB = logicalTree.getDep('b')
  const depC = logicalTree.getDep('a').getDep('c')
  t.ok(logicalTree.getDep('a').getDep('b'), 'flattened transitive dep')
  t.ok(logicalTree.getDep('a').getDep('c'), 'nested transitive dep')
  t.equal(
    depA.getDep('c').getDep('b'),
    depB,
    'matching deps have object identity'
  )
  t.deepEqual(
    depA.requiredBy,
    new Set([logicalTree]),
    'depA only required by root'
  )
  t.deepEqual(
    depB.requiredBy,
    new Set([logicalTree, depA, depC]),
    'depB required by root, A, and C'
  )
  t.deepEqual(
    depC.requiredBy,
    new Set([depA]),
    'depC is only required by A'
  )
  t.done()
})

test('errors if required dep not found', t => {
  const pkg = {
    dependencies: {
      'a': '^1.0.0',
      'b': '^2.0.0'
    }
  }
  const yarnLock = {
    'a@^1.0.0': {
      version: '1.0.1',
      dependencies: {
        b: '^2.0.0'
      }
    }
  }
  t.throws(() => {
    yarnLogicalTree(pkg, yarnLock)
  }, /b not accessible/)
  t.done()
})

test('supports dependency cycles', t => {
  const pkg = {
    dependencies: {
      'a': '^1.0.0',
      'b': '^2.0.0'
    }
  }
  const yarnLock = {
    'a@^1.0.0': {
      version: '1.0.1',
      dependencies: {
        b: '^2.0.0',
        c: '^3.0.0'
      }
    },
    'b@^2.0.0': {
      version: '2.0.2',
      dependencies: {
        a: '^1.0.0'
      }
    },
    'c@^3.0.0': {
      version: '3.0.3',
      dependencies: {
        b: '^2.0.0'
      }
    }
  }
  const logicalTree = yarnLogicalTree(pkg, yarnLock)
  const depA = logicalTree.getDep('a')
  const depB = logicalTree.getDep('b')
  const depC = depA.getDep('c')
  t.equal(
    depA.getDep('b').getDep('a'),
    depA,
    'cycle resolved successfully'
  )
  t.deepEqual(
    depA.requiredBy,
    new Set([logicalTree, depB]),
    'depA is requiredBy on depB'
  )
  t.deepEqual(
    depB.requiredBy,
    new Set([logicalTree, depA, depC]),
    'depB is requiredBy on depA'
  )
  t.done()
})

test('supports files as versions', t => {
  const pkg = {
    dependencies: {
      'a': '^1.0.0',
      'b': 'file:dir/pkg'
    }
  }
  const yarnLock = {
    'a@^1.0.0': {
      version: '1.0.1'
    },
    'b@file:dir/pkg': {
      version: '2.0.2'
    }
  }
  const logicalTree = yarnLogicalTree(pkg, yarnLock)

  t.ok(logicalTree.getDep('a'), 'dep a is there')
  t.equal(
    logicalTree.getDep('b').version,
    'file:dir/pkg',
    'dep b has file path as version'
  )
  t.done()
})
