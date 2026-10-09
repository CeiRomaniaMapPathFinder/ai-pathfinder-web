import type { RouteStep, TreeEntry } from './astarTreeApi';

export type TreeNode = {
  id: string;
  entry: TreeEntry;
  parentId: string | null;
  childIds: string[];
  depth: number;
  generatedAtStep: number;
  expandedAtStep: number | null;
  edgeCost: number | null;
  x: number;
  y: number;
};

export type SearchTree = {
  nodes: Record<string, TreeNode>;
  order: string[];
  rootId: string;
  expansions: string[];
  lists: string[][];
  finalPath: string[];
  width: number;
  height: number;
};

export type NodeStatus =
  | 'hidden'
  | 'frontier'
  | 'current'
  | 'expanded'
  | 'path'
  | 'unexpanded';

export type StepView = {
  step: number;
  isLastStep: boolean;
  goalReached: boolean;
  currentId: string;
  status: Record<string, NodeStatus>;
  frontier: string[];
  expandedCount: number;
  generatedCount: number;
};

export const NODE_WIDTH = 156;
export const NODE_HEIGHT = 44;
export const LABEL_HEIGHT = 22;
const SIBLING_GAP = 18;
const LEVEL_GAP = 50;
const PADDING = 24;

export function buildSearchTree(route: RouteStep[], goal: string): SearchTree {
  const [firstList] = route;
  if (!firstList?.length) throw new Error('The search trace is empty.');

  const nodes: Record<string, TreeNode> = {};
  const order: string[] = [];
  const byExpandedAt = new Map<number, string>();

  const addNode = (id: string, entry: TreeEntry, parent: TreeNode | null) => {
    const node: TreeNode = {
      id,
      entry,
      parentId: parent?.id ?? null,
      childIds: [],
      depth: parent ? parent.depth + 1 : 0,
      generatedAtStep: 0,
      expandedAtStep: null,
      edgeCost: parent ? entry.g - parent.entry.g : null,
      x: 0,
      y: 0,
    };
    nodes[id] = node;
    order.push(id);
    parent?.childIds.push(id);
    if (entry.expandedAt >= 0) byExpandedAt.set(entry.expandedAt, id);
    return node;
  };

  const root = addNode('0:0', firstList[0], null);
  const lists: string[][] = [];

  route.forEach((list, listIndex) => {
    const [parentEntry, ...children] = list;
    if (!parentEntry) return;

    const parentId = listIndex === 0 ? root.id : byExpandedAt.get(parentEntry.expandedAt);
    if (!parentId) {
      throw new Error(
        `Trace step ${listIndex} expands ${parentEntry.name} (expandedAt ${parentEntry.expandedAt}), ` +
          'but no earlier step generated a node with that expandedAt.',
      );
    }

    const childIds = children.map(
      (child, childIndex) => addNode(`${listIndex}:${childIndex + 1}`, child, nodes[parentId]).id,
    );
    lists.push([parentId, ...childIds]);
  });

  // expandedAt values can have gaps, so they're ranked rather than used as indices.
  const expansions = [...byExpandedAt.entries()].sort(([a], [b]) => a - b).map(([, id]) => id);
  expansions.forEach((id, step) => {
    nodes[id].expandedAtStep = step;
  });
  for (const id of order) {
    const node = nodes[id];
    const parent = node.parentId ? nodes[node.parentId] : null;
    node.generatedAtStep = parent?.expandedAtStep ?? 0;
  }

  const lastExpanded = nodes[expansions[expansions.length - 1]];
  const finalPath: string[] = [];
  if (lastExpanded?.entry.name === goal) {
    for (let node: TreeNode | null = lastExpanded; node; node = node.parentId ? nodes[node.parentId] : null) {
      finalPath.unshift(node.id);
    }
  }

  const { width, height } = layoutTree(nodes, root.id);

  return { nodes, order, rootId: root.id, expansions, lists, finalPath, width, height };
}

function layoutTree(nodes: Record<string, TreeNode>, rootId: string) {
  const step = NODE_WIDTH + SIBLING_GAP;
  const nextFree: number[] = [];
  let maxDepth = 0;

  const freeAt = (depth: number) => nextFree[depth] ?? PADDING;

  const shift = (id: string, dx: number) => {
    const node = nodes[id];
    node.x += dx;
    nextFree[node.depth] = Math.max(freeAt(node.depth), node.x + step);
    node.childIds.forEach((childId) => shift(childId, dx));
  };

  const place = (id: string) => {
    const node = nodes[id];
    node.y = PADDING + node.depth * (NODE_HEIGHT + LABEL_HEIGHT + LEVEL_GAP);
    maxDepth = Math.max(maxDepth, node.depth);

    if (node.childIds.length === 0) {
      node.x = freeAt(node.depth);
    } else {
      node.childIds.forEach(place);
      const first = nodes[node.childIds[0]];
      const last = nodes[node.childIds[node.childIds.length - 1]];
      node.x = (first.x + last.x) / 2;

      const overlap = freeAt(node.depth) - node.x;
      if (overlap > 0) {
        node.childIds.forEach((childId) => shift(childId, overlap));
        node.x += overlap;
      }
    }
    nextFree[node.depth] = node.x + step;
  };

  place(rootId);

  return {
    width: Math.max(...nextFree) - SIBLING_GAP + PADDING,
    height: PADDING * 2 + maxDepth * (NODE_HEIGHT + LABEL_HEIGHT + LEVEL_GAP) + NODE_HEIGHT + LABEL_HEIGHT,
  };
}

export function viewAtStep(tree: SearchTree, step: number): StepView {
  const isLastStep = step >= tree.expansions.length - 1;
  const goalReached = isLastStep && tree.finalPath.length > 0;
  const onPath = new Set(goalReached ? tree.finalPath : []);

  const status: Record<string, NodeStatus> = {};
  const frontier: string[] = [];
  let expandedCount = 0;
  let generatedCount = 0;

  for (const id of tree.order) {
    const node = tree.nodes[id];
    const expandedAt = node.expandedAtStep;

    if (node.generatedAtStep > step && id !== tree.rootId) {
      status[id] = 'hidden';
      continue;
    }
    generatedCount += 1;

    if (onPath.has(id)) status[id] = 'path';
    else if (expandedAt === step) status[id] = 'current';
    else if (expandedAt !== null && expandedAt < step) status[id] = 'expanded';
    else status[id] = isLastStep ? 'unexpanded' : 'frontier';

    if (expandedAt !== null && expandedAt <= step) expandedCount += 1;
    else frontier.push(id);
  }

  // Ties broken by h (closer to goal first), matching the usual A* tiebreak.
  frontier.sort((a, b) => {
    const ea = tree.nodes[a].entry;
    const eb = tree.nodes[b].entry;
    return ea.f - eb.f || ea.h - eb.h;
  });

  return {
    step,
    isLastStep,
    goalReached,
    currentId: tree.expansions[step],
    status,
    frontier,
    expandedCount,
    generatedCount,
  };
}

export function finalPathNames(tree: SearchTree): string[] {
  return tree.finalPath.map((id) => tree.nodes[id].entry.name);
}
