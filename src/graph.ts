type Nullable<T> = T | null;

const fnull = <TIn, TOut>(
  fn: (arg: TIn) => TOut,
  defaultVal: TIn,
): ((arg: Nullable<TIn>) => TOut) => {
  return (x: Nullable<TIn>): TOut => fn(x === null ? defaultVal : x);
};

const updateMut = <TKey, TVal, TMap extends Map<TKey, TVal>>(
  m: TMap,
  key: TKey,
  fn: (arg: TVal | null) => TVal,
) => {
  m.set(key, fn(m.get(key) ?? null));
};

const update = <TKey, TVal, TMap extends Map<TKey, TVal>>(
  m: TMap,
  key: TKey,
  fn: (arg: TVal | null) => TVal,
): TMap => {
  const clone = new Map(m.entries()) as TMap;
  updateMut(clone, key, fn);
  return clone;
};

const addToSet = <TElem, TSet extends Set<TElem>>(
  x: TElem,
): ((set: TSet) => TSet) => {
  return (set: TSet) => set.add(x);
};

const newSetWithout = <TElem, TSet extends Set<TElem>>(
  x: TElem,
): ((set: TSet) => TSet) => {
  return (set: TSet) => {
    const newSet = new Set(set.values()) as TSet;
    newSet.delete(x);
    return newSet;
  };
};

export class Graph<TNode> {
  constructor(
    private dependencies: Map<TNode, Set<TNode>> = new Map(),
    private dependents: Map<TNode, Set<TNode>> = new Map(),
  ) {
    this.dependencies = dependencies;
    this.dependents = dependents;
  }

  get nodes(): Set<TNode> {
    return new Set([
      ...Array.from(this.dependencies.keys()),
      ...Array.from(this.dependents.keys()),
    ]);
  }

  withoutEdge(node: TNode, dep: TNode): Graph<TNode> {
    return new Graph(
      update(
        this.dependencies,
        node,
        fnull(newSetWithout(dep), new Set() as Set<TNode>),
      ),
      update(
        this.dependents,
        dep,
        fnull(newSetWithout(node), new Set() as Set<TNode>),
      ),
    );
  }

  withoutNode(node: TNode): Graph<TNode> {
    const newDependencies = new Map(this.dependencies.entries());
    newDependencies.delete(node);

    return new Graph(newDependencies, new Map(this.dependents.entries()));
  }

  immediateDependencies(node: TNode): Nullable<Set<TNode>> {
    return this.dependencies.get(node) ?? null;
  }

  transitiveDependencies(node: TNode): Set<TNode> {
    return new Set(this.transitive(node, (g, n) => g.immediateDependencies(n)));
  }

  immediateDependents(node: TNode): Nullable<Set<TNode>> {
    return this.dependents.get(node) ?? null;
  }

  transitiveDependents(node: TNode): Set<TNode> {
    return new Set(this.transitive(node, (g, n) => g.immediateDependents(n)));
  }

  dependOn(node: TNode, dep: TNode) {
    if (node === dep || this.dependsOn(dep, node)) {
      const depStructure = [dep, ...this.topoSort(dep)];
      throw new Error(`Circular dependency: ${depStructure.join(' <- ')}`);
    }

    updateMut(
      this.dependencies,
      node,
      fnull(addToSet(dep), new Set() as Set<TNode>),
    );
    updateMut(
      this.dependents,
      dep,
      fnull(addToSet(node), new Set() as Set<TNode>),
    );
  }

  dependsOn(node: TNode, dep: TNode): boolean {
    return this.transitiveDependencies(node).has(dep);
  }

  hasDependent(dep: TNode, node: TNode): boolean {
    return this.transitiveDependents(dep).has(node);
  }

  topoSort(fromNode: TNode | null = null): TNode[] {
    let sorted = [];
    let graph: Graph<TNode> = this;
    let remaining = this.leaves();

    while (remaining.length > 0) {
      const [nextNode, ...restNodes] = remaining;
      let deps = [
        ...(graph.immediateDependencies(nextNode) || new Set()).values(),
      ];
      let addlNodes: Set<TNode> = new Set();

      while (deps.length > 0) {
        const [dep, ...restDeps] = deps;
        graph = graph.withoutEdge(nextNode, dep);

        const nextDeps = graph.immediateDependents(dep);
        if (nextDeps === null || nextDeps.size === 0) {
          addlNodes.add(dep);
        }

        deps = restDeps;
      }

      sorted.unshift(nextNode);
      graph = graph.withoutNode(nextNode);
      const remainingSet = new Set(restNodes);
      for (const node of addlNodes.values()) {
        remainingSet.add(node);
      }
      remaining = [...remainingSet.values()];
    }

    if (fromNode === null) {
      return sorted;
    }

    // If fromNode provided, drop the nodes that are not in its immediate dependency lineage
    const nodeDeps = this.transitiveDependencies(fromNode).add(fromNode);
    return sorted.filter((node) => nodeDeps.has(node));
  }

  private leaves(): TNode[] {
    const allNodes = [...this.nodes.values()];
    const allLeaves = allNodes.filter(
      (node) => this.immediateDependents(node) === null,
    );
    // Deduplicate
    const distinctLeaves = new Set(allLeaves);

    return [...distinctLeaves.values()];
  }

  private transitive(
    node: TNode,
    getNext: (g: Graph<TNode>, elem: TNode) => Nullable<Set<TNode>>,
  ): TNode[] {
    const nextNodes = getNext(this, node);
    if (nextNodes === null) {
      return [];
    }
    const nextNodeList = [...nextNodes.values()];

    return nextNodeList.reduce(
      (acc, node) => acc.concat(this.transitive(node, getNext)),
      nextNodeList,
    );
  }
}
