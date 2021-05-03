import { Graph } from './graph';

const comesBefore = <T>(lst: T[], x: T, y: T): void => {
  const xPos = lst.indexOf(x);
  const yPos = lst.indexOf(y);

  if (xPos === -1 || xPos > yPos) {
    throw new Error(`Expected ${JSON.stringify(x)}:${xPos} to come before ${JSON.stringify(y)}:${yPos}`);

  }
};

test('creates a graph', () => {
  const g = new Graph();
  expect(g).toBeInstanceOf(Graph);
});

test('considers an immediate dependency as a dependency', () => {
  const g = new Graph();
  g.dependOn('x', 'y');
  expect(g.dependsOn('x', 'y')).toEqual(true);
});

test('considers a transitive dependency as a dependency', () => {
  const g = new Graph();
  g.dependOn('x', 'y');
  g.dependOn('y', 'z');
  expect(g.dependsOn('x', 'z')).toEqual(true);
});

test('does not consider a nonexistent node as a dependency', () => {
  const g = new Graph();
  g.dependOn('x', 'y');
  expect(g.dependsOn('x', 'z')).toEqual(false);
});

test('does not consider a non-dependency as a dependency', () => {
  const g = new Graph();
  g.dependOn('x', 'y');
  g.dependOn('a', 'b');
  expect(g.dependsOn('x', 'b')).toEqual(false);
});

test('does not consider cousins as dependent', () => {
  const g = new Graph();
  g.dependOn('x', 'y');
  g.dependOn('x', 'z');
  expect(g.dependsOn('y', 'z')).toEqual(false);
  expect(g.dependsOn('z', 'y')).toEqual(false);
});

test('does not allow a self-dependency', () => {
  const g = new Graph();
  expect(() => g.dependOn('x', 'x')).toThrow();
});

test('does not allow a circular dependency', () => {
  const g = new Graph();
  g.dependOn('x', 'y');
  expect(() => g.dependOn('y', 'x')).toThrow();

  g.dependOn('y', 'z');
  expect(() => g.dependOn('z', 'y')).toThrow();
});

test('considers a parent as having a dependency as its dependent', () => {
  const g = new Graph();
  g.dependOn('x', 'y');

  expect(g.hasDependent('y', 'x')).toEqual(true);
});

test('considers an ancestor as having a transitive dependency as its dependent', () => {
  const g = new Graph();
  g.dependOn('x', 'y');
  g.dependOn('y', 'z');

  expect(g.hasDependent('z', 'x')).toEqual(true);
});

test('transitive relationships', () => {
  const g = new Graph();
  g.dependOn('x', 'y');
  g.dependOn('y', 'z');
  g.dependOn('x', 'y1');
  g.dependOn('a', 'b');
  g.dependOn('a', 'y');

  // Should get the full set of dependencies.
  expect([...g.transitiveDependencies('x').values()].sort()).toEqual(
    ['y', 'z', 'y1'].sort(),
  );

  // Should get the full set of dependents.
  expect([...g.transitiveDependents('y').values()].sort()).toEqual(
    ['x', 'a'].sort(),
  );
});

// Topological
test('topoligical sort', () => {
  const g = new Graph();
  g.dependOn('cake', 'eggs');
  g.dependOn('cake', 'flour');
  g.dependOn('eggs', 'chickens'); // So now we know which came first (in the topology of a cake, at least)
  g.dependOn('flour', 'grain');
  g.dependOn('chickens', 'grain');
  g.dependOn('grain', 'soil');

  const topoSorted = g.topoSort();
  [
    ['soil', 'grain'],
    ['grain', 'chickens'],
    ['grain', 'flour'],
    ['chickens', 'eggs'],
    ['flour', 'cake'],
    ['eggs', 'cake'],
  ].forEach(([earlier, later]) =>
    expect(() => comesBefore(topoSorted, earlier, later)).not.toThrow(),
  );

  const topoSortedSubgraph = g.topoSort('flour');
  expect(topoSortedSubgraph).toEqual(['soil', 'grain', 'flour']);
});
