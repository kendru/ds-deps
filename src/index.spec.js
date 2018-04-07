const { expect } = require('chai');
const deps = require('./index');

const { Graph } = deps;

function comesBefore(lst, x, y) {
    const xPos = lst.indexOf(x);
    const yPos = lst.indexOf(y);

    return xPos !== -1 && xPos < yPos;
}

describe('dependency graphs', () => {
    let g;

    beforeEach(() => {
        g = new Graph();
    });

    it('should create a graph', () => {
        expect(g).to.be.an.instanceOf(Graph);
    });

    it('should consider an immediate dependency as a dependency', () => {
        g.dependOn('x', 'y');
        expect(g.dependsOn('x', 'y')).to.be.true;
    });

    it('should consider a transitive dependency as a dependency', () => {
        g.dependOn('x', 'y');
        g.dependOn('y', 'z');
        expect(g.dependsOn('x', 'z')).to.be.true;
    });

    it('should not consider a nonexistent node as a dependency', () => {
        g.dependOn('x', 'y');
        expect(g.dependsOn('x', 'z')).to.be.false;
    });

    it('should not consider a non-dependency as a dependency', () => {
        g.dependOn('x', 'y');
        g.dependOn('a', 'b');
        expect(g.dependsOn('x', 'b')).to.be.false;
    });

    it('should not consider cousins as dependent', () => {
        g.dependOn('x', 'y');
        g.dependOn('x', 'z');
        expect(g.dependsOn('y', 'z')).to.be.false;
        expect(g.dependsOn('z', 'y')).to.be.false;
    });

    it('should not allow a self-dependency', () => {
        expect(() => g.dependOn('x', 'x')).to.throw();
    });

    it('should not allow a circular dependency', () => {
        g.dependOn('x', 'y');
        expect(() => g.dependOn('y', 'x')).to.throw();        
        
        g.dependOn('y', 'z');
        expect(() => g.dependOn('z', 'y')).to.throw();
    });

    it('should consider a parent as having a dependency as its dependent', () => {
        g.dependOn('x', 'y');
        
        expect(g.hasDependent('y', 'x')).to.be.true;
    });

    it('should consider an ancestor as having a transitive dependency as its dependent', () => {
        g.dependOn('x', 'y');
        g.dependOn('y', 'z');
        
        expect(g.hasDependent('z', 'x')).to.be.true;
    });

    describe('transitive relationships', () => {

        beforeEach(() => {
            g.dependOn('x', 'y');
            g.dependOn('y', 'z');
            g.dependOn('x', 'y1');
            g.dependOn('a', 'b');
            g.dependOn('a', 'y');
        });

        it('should get the full set of dependencies', () => {
            expect([...g.transitiveDependencies('x').values()])
                .to.have.same.members(['y', 'z', 'y1']);
        });
    
        it('should get the full set of dependents', () => {
            expect([...g.transitiveDependents('y').values()])
                .to.have.same.members(['x', 'a']);
        });
    });

    describe('topological sorting', () => {

        beforeEach(() => {
            g.dependOn('cake', 'eggs');
            g.dependOn('cake', 'flour');
            g.dependOn('eggs', 'chickens'); // So now we know which came first (in the topology of a cake, at least)
            g.dependOn('flour', 'grain');
            g.dependOn('chickens', 'grain');
            g.dependOn('grain', 'soil');
        });
        
        it('should generate a topological sort of the graph', () => {
            const topoSorted = g.topoSort();

            [
                ['soil', 'grain'],
                ['grain', 'chickens'],
                ['grain', 'flour'],
                ['chickens', 'eggs'],
                ['flour', 'cake'],
                ['eggs', 'cake']
            ].forEach(([earlier, later]) =>
                expect(comesBefore(topoSorted, earlier, later)).to.be.true);
        });

        it('should generate a topological sort of a subgraph', () => {
            const topoSorted = g.topoSort('flour');

            expect(topoSorted).to.eql(['soil', 'grain', 'flour']);
        });
    });
});