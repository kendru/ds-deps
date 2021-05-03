# ds-deps

Dead-simple dependency graph.

*ds-deps* provides a graph data structure for building dependency trees.
It has facilities for declaring dependencies as well as querying for
direct and transitive dependency/dependant relationships and topologically
sorting the graph. The goal of the library is to provide the building blocks
for more interesting things like dependency resolution for a DI frameworks.

This library is heavily inspired by [Stuart Sierra's](https://github.com/stuartsierra)
[dependency](https://github.com/stuartsierra/dependency) library. In fact, it is
little more than a partial port of that library from Clojure to JavaScript.

### Usage

```javascript
import { Graph } from 'ds-deps';

const g = new Graph();
g.dependOn('cake', 'eggs');
g.dependOn('cake', 'flour');
g.dependOn('eggs', 'chickens');
g.dependOn('flour', 'grain');
g.dependOn('chickens', 'grain');
g.dependOn('grain', 'soil');

g.dependsOn('cake', 'soil');
// -> true

g.dependsOn('grain', 'cake');
// -> false

g.topoSort();
// -> [ 'soil', 'grain', 'chickens', 'flour', 'eggs', 'cake' ]
```
