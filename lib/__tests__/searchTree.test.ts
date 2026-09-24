import { describe, expect, it } from 'vitest';
import { buildSearchTree, NODE_WIDTH, viewAtStep } from '../searchTree';
import { normalizeRoutes } from '../astarTreeApi';
import mockAStarTreeResponse from '../mockAStarTreeResponse.json';

type RawFixture = { start: string; goal: string; routes: Record<string, unknown> };
const fixtures = (mockAStarTreeResponse as { routes: RawFixture[] }).routes;
const aradBucharest = fixtures.find((f) => f.start === 'Arad' && f.goal === 'Bucharest')!;
const aradRoutes = normalizeRoutes(aradBucharest.routes);

describe('buildSearchTree — Arad -> Bucharest (real recorded fixture)', () => {
  const tree = buildSearchTree(aradRoutes, 'Bucharest');

  it('roots the tree at Arad', () => {
    expect(tree.nodes[tree.rootId].entry.name).toBe('Arad');
  });

  it('expands in order Arad, Sibiu, Rimnicu Vilcea, Pitesti, Bucharest', () => {
    expect(tree.expansions.map((id) => tree.nodes[id].entry.name)).toEqual([
      'Arad', 'Sibiu', 'Rimnicu Vilcea', 'Pitesti', 'Bucharest',
    ]);
  });

  it('a node with expandedAt === -1 is a leaf with status "unexpanded"', () => {
    const timisoaraId = tree.order.find((id) => tree.nodes[id].entry.name === 'Timisoara')!;
    expect(tree.nodes[timisoaraId].entry.expandedAt).toBe(-1);
    expect(tree.nodes[timisoaraId].childIds).toEqual([]);

    const lastStep = tree.expansions.length - 1;
    const view = viewAtStep(tree, lastStep);
    expect(view.status[timisoaraId]).toBe('unexpanded');
  });

  it('Sibiu appears twice with different g — the expanded one (g=140) links into the chain, the stale one (g=300) is a separate unexpanded leaf', () => {
    const sibiuIds = tree.order.filter((id) => tree.nodes[id].entry.name === 'Sibiu');
    expect(sibiuIds).toHaveLength(2);

    const expanded = sibiuIds.find((id) => tree.nodes[id].entry.g === 140)!;
    const stale = sibiuIds.find((id) => tree.nodes[id].entry.g === 300)!;

    expect(tree.expansions).toContain(expanded);
    expect(tree.expansions).not.toContain(stale);
    expect(tree.nodes[stale].childIds).toEqual([]);

    const lastView = viewAtStep(tree, tree.expansions.length - 1);
    expect(lastView.status[stale]).toBe('unexpanded');
  });

  it('lays out Sibiu\'s 4 real children without overlap or throwing', () => {
    const sibiuExpandedId = tree.expansions[1];
    const sibiuNode = tree.nodes[sibiuExpandedId];
    expect(sibiuNode.entry.name).toBe('Sibiu');
    expect(sibiuNode.childIds).toHaveLength(4);

    const xs = sibiuNode.childIds.map((id) => tree.nodes[id].x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(NODE_WIDTH);
    }
  });

  it('f === g + h for every node in the real fixture', () => {
    for (const id of tree.order) {
      const { f, g, h } = tree.nodes[id].entry;
      expect(f).toBe(g + h);
    }
  });
});

describe('normalizeRoutes — f falls back to g + h when the backend omits fn', () => {
  it('computes f itself for every entry missing fn', () => {
    const raw = {
      '0': [
        { town: 'Arad', gn: 0, hn: 453, expandedAt: 0 },
        { town: 'Sibiu', gn: 140, hn: 302, expandedAt: -1 },
      ],
    };

    const routes = normalizeRoutes(raw);
    expect(routes[0][0].f).toBe(453);
    expect(routes[0][1].f).toBe(442);

    const tree = buildSearchTree(routes, 'Sibiu');
    expect(tree.nodes[tree.rootId].entry.f).toBe(453);
  });
});
