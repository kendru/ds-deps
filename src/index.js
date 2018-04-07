function isNullish(x) {
    return typeof x === 'undefined' || x === null;
}
function fnull(fn, defaultVal) {
    return x => fn(isNullish(x) ? defaultVal : x);
}

function updateMut(obj, key, fn) {
    obj[key] = fn(obj[key]);
}

function update(obj, key, fn) {
    return Object.assign ({}, obj, { [key]: fn(obj[key]) });
}

function addToSet(x) {
    return set => set.add(x);
}

function newSetWitout(x) {
    return set => {
        let newSet = new Set([...set.values()])
        newSet.delete(x);
        return newSet;
    };
}

function transitive(graph, node, getter) {
    const nextNodes = graph[getter](node);
    if (nextNodes === null) {
        return [];
    }
    const nextNodeList = Array.from(nextNodes.values());
    
    return nextNodeList.reduce(
        (acc, node) => acc.concat(transitive(graph, node, getter)), nextNodeList);
}

function leaves(graph, rels) {
    const allNodes = [...graph.nodes.values()];
    const allLeaves = allNodes.filter(node => graph.immediateDependents(node) === null);
    // Deduplicate
    const distinctLeaves = new Set(allLeaves);
    
    return [...distinctLeaves.values()];
}

class Graph {

    constructor(dependencies = {}, dependents = {}) {
        this.dependencies = dependencies;
        this.dependents = dependents;
    }

    get nodes() {
        return new Set([
            ...Object.keys(this.dependencies),
            ...Object.keys(this.dependents)
        ]);
    }

    withoutEdge(node, dep) {
        return new Graph(
            update(this.dependencies, node, fnull(newSetWitout(dep), new Set())),
            update(this.dependents, dep, fnull(newSetWitout(node), new Set()))
        );
    }

    withoutNode(node) {
        const newDependencies = Object.assign({}, this.dependencies);
        delete newDependencies[node];

        return new Graph(newDependencies, Object.assign({}, this.dependents));
    }

    immediateDependencies(node) {
        return this.dependencies[node] || null;
    }

    transitiveDependencies(node) {
        return new Set(transitive(this, node, 'immediateDependencies'));
    }

    immediateDependents(node) {
        return this.dependents[node] || null;
    }

    transitiveDependents(node) {
        return new Set(transitive(this, node, 'immediateDependents'));
    }

    dependOn(node, dep) {
        if (node === dep || this.dependsOn(dep, node)) {
            const depStructure = [dep, ...this.topoSort(dep)];
            throw new Error(`Circular dependency: ${depStructure.join(' <- ')}`);
        }

        updateMut(this.dependencies, node, fnull(addToSet(dep), new Set()));
        updateMut(this.dependents, dep, fnull(addToSet(node), new Set()));
    }

    dependsOn(node, dep) {
        return this.transitiveDependencies(node).has(dep);
    }

    hasDependent(dep, node) {
        return this.transitiveDependents(dep).has(node);
    }

    topoSort(fromNode = null) {
        let sorted = [];
        let graph = this;
        let remaining = leaves(this, this.dependents);

        while(remaining.length > 0) {
            const [nextNode, ...restNodes] = remaining;
            let deps = [...(graph.immediateDependencies(nextNode) || new Set()).values()];
            let addlNodes = new Set();

            while(deps.length > 0) {
                const [dep, ...restDeps] = deps;
                graph = graph.withoutEdge(nextNode, dep);

                if ([...graph.immediateDependents(dep).values()].length === 0) {
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
        return sorted.filter(node => nodeDeps.has(node));
    }
}

module.exports = {
    Graph
};