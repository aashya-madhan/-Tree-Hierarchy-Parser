const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Build nested tree object from adjacency graph
function buildTree(root, graph) {
  const node = {};
  for (const child of (graph[root] || [])) {
    node[child] = buildTree(child, graph);
  }
  return node;
}

// Depth = number of nodes on longest root-to-leaf path
function getDepth(nodeObj) {
  const keys = Object.keys(nodeObj);
  if (keys.length === 0) return 1;
  return 1 + Math.max(...keys.map(k => getDepth(nodeObj[k])));
}

// DFS cycle detection within a connected component
function detectCycle(nodes, graph) {
  const color = {}; // 0=white, 1=gray, 2=black
  for (const n of nodes) color[n] = 0;

  function dfs(node) {
    color[node] = 1;
    for (const child of (graph[node] || [])) {
      if (color[child] === 1) return true;
      if (color[child] === 0 && dfs(child)) return true;
    }
    color[node] = 2;
    return false;
  }

  for (const n of nodes) {
    if (color[n] === 0 && dfs(n)) return true;
  }
  return false;
}

// Find connected components using Union-Find
function getComponents(allNodes, edges) {
  const parent = {};
  for (const n of allNodes) parent[n] = n;

  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(a, b) {
    parent[find(a)] = find(b);
  }

  for (const [p, c] of edges) union(p, c);

  const groups = {};
  for (const n of allNodes) {
    const root = find(n);
    if (!groups[root]) groups[root] = new Set();
    groups[root].add(n);
  }
  return Object.values(groups).map(s => [...s]);
}

app.post("/bfhl", (req, res) => {
  const data = req.body.data || [];

  const invalid_entries = [];
  const duplicate_edges = [];
  const seenEdges = new Set();
  const graph = {};       // parent -> [children]
  const childParent = {}; // child -> first parent (multi-parent handling)
  const allEdges = [];    // valid unique [parent, child] pairs

  for (const item of data) {
    const trimmed = typeof item === "string" ? item.trim() : String(item).trim();

    // Validate: must be exactly X->Y, single uppercase letters, not self-loop
    if (!/^[A-Z]->[A-Z]$/.test(trimmed) || trimmed[0] === trimmed[3]) {
      invalid_entries.push(item);
      continue;
    }

    // Duplicate check
    if (seenEdges.has(trimmed)) {
      if (!duplicate_edges.includes(trimmed)) duplicate_edges.push(trimmed);
      continue;
    }
    seenEdges.add(trimmed);

    const parent = trimmed[0];
    const child = trimmed[3];

    // Multi-parent: first-encountered parent wins
    if (childParent[child] !== undefined) {
      // silently discard subsequent parent edges for this child
      continue;
    }

    childParent[child] = parent;
    if (!graph[parent]) graph[parent] = [];
    graph[parent].push(child);
    allEdges.push([parent, child]);
  }

  const allNodes = new Set();
  for (const [p, c] of allEdges) {
    allNodes.add(p);
    allNodes.add(c);
  }

  const childrenSet = new Set(Object.keys(childParent));
  const components = getComponents([...allNodes], allEdges);

  const hierarchies = [];
  let total_cycles = 0;
  let largest_tree_root = null;
  let maxDepth = 0;

  for (const component of components) {
    const hasCycle = detectCycle(component, graph);

    // Find root(s): nodes in this component that are never a child
    const roots = component.filter(n => !childrenSet.has(n)).sort();

    if (hasCycle) {
      // Use lex-smallest node as root for pure cycles
      const root = roots.length > 0 ? roots[0] : [...component].sort()[0];
      hierarchies.push({ root, tree: {}, has_cycle: true });
      total_cycles++;
    } else {
      // Each component should have exactly one root for a valid tree
      const root = roots.length > 0 ? roots[0] : [...component].sort()[0];
      const treeContent = buildTree(root, graph);
      const tree = { [root]: treeContent };
      const fullDepth = calcDepth(root, graph);

      if (fullDepth > maxDepth || (fullDepth === maxDepth && (largest_tree_root === null || root < largest_tree_root))) {
        maxDepth = fullDepth;
        largest_tree_root = root;
      }

      hierarchies.push({ root, tree, depth: fullDepth });
    }
  }

  // Sort hierarchies: non-cyclic first by root, then cyclic
  hierarchies.sort((a, b) => {
    if (a.has_cycle && !b.has_cycle) return 1;
    if (!a.has_cycle && b.has_cycle) return -1;
    return a.root.localeCompare(b.root);
  });

  res.json({
    user_id: "aashyamadhan_01072005",
    email_id: "am5066@srmist.edu.in",
    college_roll_number: "RA2311003020386",
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees: hierarchies.filter(h => !h.has_cycle).length,
      total_cycles,
      largest_tree_root: largest_tree_root || ""
    }
  });
});

function calcDepth(node, graph) {
  const children = graph[node] || [];
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map(c => calcDepth(c, graph)));
}

app.get("/", (req, res) => res.send("Backend running..."));

app.listen(5000, () => console.log("Server running on port 5000"));
