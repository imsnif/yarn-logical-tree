'use strict'

const BB = require('bluebird')

const test = require('tap').test

const yarnLogicalTree = require('../')

// these tests essentially just test npm-logical-tree
// they are here for the sake of completeness
// as well as making sure we expose the same api where relevant

test('delDep', t => {
  const tree = yarnLogicalTree.node('foo')
  const dep = yarnLogicalTree.node('bar')
  tree.addDep(dep)
  t.equal(tree.delDep(dep), tree, 'returns the tree')
  t.deepEqual(tree.dependencies, new Map(), 'nothing in tree.dependencies')
  t.deepEqual(dep.requiredBy, new Set(), 'nothing in dep.requiredBy')
  t.done()
})

test('getDep', t => {
  const tree = yarnLogicalTree.node('foo')
  const dep = yarnLogicalTree.node('bar')
  tree.addDep(dep)
  t.equal(tree.getDep('bar'), dep, 'got dep named bar')
  t.equal(tree.getDep('baz'), undefined, 'nothing if no dep w/ that name')
  t.done()
})

test('logicalTree.node', t => {
  const tree = yarnLogicalTree.node('hey')
  t.similar(tree, {
    name: 'hey',
    version: undefined,
    address: '',
    optional: false,
    dev: false,
    bundled: false,
    resolved: undefined,
    integrity: undefined,
    dependencies: new Map(),
    requiredBy: new Set()
  }, 'default construction')
  t.equal(tree.isRoot, true, 'detected as root')
  const dep = yarnLogicalTree.node('there', 'i:am:here', {
    version: '1.1.1',
    optional: true,
    dev: true,
    bundled: true,
    resolved: 'here/it/is',
    integrity: 'sha1-deadbeef'
  })
  t.similar(dep, {
    name: 'there',
    address: 'i:am:here',
    version: '1.1.1',
    optional: true,
    dev: true,
    bundled: true,
    resolved: 'here/it/is',
    integrity: 'sha1-deadbeef'
  }, 'accepts address and options')
  t.done()
})

test('hasCycle', t => {
  const tree = yarnLogicalTree.node('root')
  const dep1 = yarnLogicalTree.node('dep1')
  const dep2 = yarnLogicalTree.node('dep2')
  const dep3 = yarnLogicalTree.node('dep3')
  tree.addDep(dep1.addDep(dep2))
  t.equal(tree.hasCycle(), false, 'no cycle found for tree')
  t.equal(dep1.hasCycle(), false, 'no cycle found for dep1')
  t.equal(dep2.hasCycle(), false, 'no cycle found for dep2')
  dep2.addDep(dep1)
  t.equal(tree.hasCycle(), false, 'no cycle found for tree')
  t.equal(dep1.hasCycle(), true, 'dep1 has a cycle')
  t.equal(dep2.hasCycle(), true, 'dep2 has a cycle')
  dep2.delDep(dep1).addDep(dep3)
  dep3.addDep(dep1)
  t.equal(tree.hasCycle(), false, 'no cycle found for tree')
  t.equal(dep1.hasCycle(), true, 'dep1 has transitive cycle')
  t.equal(dep2.hasCycle(), true, 'dep2 has transitive cycle')
  t.equal(dep3.hasCycle(), true, 'dep3 has transitive cycle')
  dep3.addDep(tree)
  dep1.addDep(tree)
  tree.addDep(dep2)
  t.equal(tree.hasCycle(), true, 'complex cycle resolved successfully')
  const selfRef = yarnLogicalTree.node('selfRef')
  selfRef.addDep(selfRef)
  t.equal(selfRef.hasCycle(), true, 'self-referencing dep handled')
  t.done()
})

test('forEachAsync', t => {
  const tree = yarnLogicalTree.node('root')
  const dep1 = yarnLogicalTree.node('dep1')
  const dep2 = yarnLogicalTree.node('dep2')
  const dep3 = yarnLogicalTree.node('dep3')

  tree.addDep(dep1.addDep(dep2.addDep(dep3)))
  let found = []
  return tree.forEachAsync((dep, next) => {
    return Promise.resolve(found.push(dep))
  })
    .then(() => {
      t.deepEqual(found, [tree], 'no children unless next is used')
      found = []
      return tree.forEachAsync((dep, next) => {
        return next().then(() => found.push(dep))
      })
    })
    .then(() => {
      t.deepEqual(found, [dep3, dep2, dep1, tree], 'next() iterates down')
      found = []
      return tree.forEachAsync((dep, next) => {
        found.push(dep)
        return next()
      })
    })
    .then(() => {
      t.deepEqual(found, [tree, dep1, dep2, dep3], 'next() can be called after')
      found = []
      const mapFn = (dep, next) => {
        found.push(dep)
        return next()
      }
      let usedFakePromise = false
      const fakeP = {
        map (arr, fn) {
          usedFakePromise = true
          return BB.map(arr, fn)
        },
        resolve: BB.resolve
      }
      return tree.forEachAsync(mapFn, {Promise: fakeP})
        .then(() => {
          t.deepEqual(found, [tree, dep1, dep2, dep3], 'next() can be called after')
          t.ok(usedFakePromise, 'used fake promise')
        })
    })
    .then(() => {
      found = []
      dep3.addDep(tree)
      return tree.forEachAsync((dep, next) => {
        found.push(dep)
        return next()
      })
    })
    .then(() => {
      t.deepEqual(found, [tree, dep1, dep2, dep3], 'handled cycle correctly')
    })
})

test('forEach', t => {
  const tree = yarnLogicalTree.node('root')
  const dep1 = yarnLogicalTree.node('dep1')
  const dep2 = yarnLogicalTree.node('dep2')
  const dep3 = yarnLogicalTree.node('dep3')

  tree.addDep(dep1.addDep(dep2.addDep(dep3)))
  let found = []
  tree.forEach((dep, next) => {
    return found.push(dep)
  })
  t.deepEqual(found, [tree], 'no children unless next is used')

  found = []
  tree.forEach((dep, next) => {
    next()
    found.push(dep)
  })
  t.deepEqual(found, [dep3, dep2, dep1, tree], 'next() iterates down')

  found = []
  tree.forEach((dep, next) => {
    found.push(dep)
    next()
  })
  t.deepEqual(found, [tree, dep1, dep2, dep3], 'next() can be called after')

  found = []
  dep3.addDep(tree)
  tree.forEach((dep, next) => {
    found.push(dep)
    next()
  })
  t.deepEqual(found, [tree, dep1, dep2, dep3], 'handles cycles correctly')

  t.done()
})
