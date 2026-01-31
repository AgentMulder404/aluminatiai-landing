# Decision Tree Visualization - Implementation Notes

## Current Implementation

**Library:** `react-organizational-chart`
- ✅ Simple, lightweight hierarchical tree rendering
- ✅ Works out-of-the-box with minimal setup
- ✅ Good for static/semi-static trees
- ✅ Perfect for hackathon demos and MVPs

**Features Implemented:**
- Interactive node selection with sidebar details
- Click to explore paths and see cumulative savings
- Color-coded nodes (high savings = green, tradeoffs = orange)
- Hover tooltips
- Path highlighting
- Responsive design with Tailwind CSS

## Future Upgrade Path: React Flow (@xyflow/react)

For production or advanced features, consider migrating to **React Flow**:

### Why Upgrade?

**Advanced Interactivity:**
- ✨ Built-in zoom, pan, and fit-to-view controls
- ✨ Drag-and-drop node repositioning
- ✨ Collapsible/expandable branches
- ✨ Minimap for large trees
- ✨ Edge animations and custom styling

**Layout Algorithms:**
- ✨ Auto-layout with dagre, elk, or d3-hierarchy
- ✨ Better handling of complex, deep trees
- ✨ Configurable node spacing and alignment

**Performance:**
- ✨ Virtual rendering for massive trees (1000+ nodes)
- ✨ Optimized re-rendering

**Customization:**
- ✨ Custom edge types (smooth, straight, step)
- ✨ Edge labels and markers
- ✨ Node handles for interactive connections
- ✨ Full control over layout algorithms

### Migration Guide

**1. Install Dependencies:**
```bash
npm install @xyflow/react
```

**2. Basic React Flow Setup:**
```tsx
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Convert TreeNode to React Flow nodes/edges
function treeToFlowElements(tree: TreeNode) {
  const nodes = [];
  const edges = [];

  function traverse(node: TreeNode, parentId?: string, x = 0, y = 0) {
    nodes.push({
      id: node.id,
      type: 'custom',  // Use custom node component
      data: node,
      position: { x, y },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        animated: node.savings_pct && node.savings_pct > 30,
      });
    }

    node.children.forEach((child, i) => {
      traverse(child, node.id, x + (i - node.children.length/2) * 300, y + 200);
    });
  }

  traverse(tree);
  return { nodes, edges };
}

function DecisionTreeFlow({ tree }: { tree: TreeNode }) {
  const { nodes, edges } = treeToFlowElements(tree);

  return (
    <div style={{ height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{ custom: TreeNodeCard }}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

**3. Use Auto-Layout with dagre:**
```bash
npm install dagre
```

```tsx
import dagre from 'dagre';

function getLayoutedElements(nodes, edges, direction = 'TB') {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 250, height: 100 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - 125,
      y: nodeWithPosition.y - 50,
    };
  });

  return { nodes, edges };
}
```

### When to Upgrade

**Stick with `react-organizational-chart` if:**
- Tree has < 50 nodes
- Static or mostly static layout
- Simple click/select interactions
- Quick hackathon demo
- Minimal dependencies preferred

**Upgrade to React Flow if:**
- Need zoom/pan controls
- Want collapsible branches
- Tree has 100+ nodes
- Need drag-and-drop
- Building production app
- Want advanced edge styling
- Need minimap for navigation

## Current Component Architecture

```
components/
├── DecisionTreeVisual.tsx       # Main component
├── TreeNodeCard.tsx              # Custom node renderer
lib/
├── decisionTree.ts               # Types and utilities
app/
├── api/generate-tree/route.ts   # MiniMax M2.1 integration
├── demo/tree/page.tsx            # Demo page
```

## API Integration

**Generate Tree:**
- POST `/api/generate-tree`
- Uses MiniMax M2.1 to create optimization trees
- Accepts workload description or agent response
- Returns TreeNode structure

**Use with Agent:**
- POST `/api/agent` → get energy estimates
- Pass response to DecisionTreeVisual
- Auto-generates tree with context

## Tips for Customization

1. **Node Styling:** Edit `TreeNodeCard.tsx` for custom designs
2. **Sidebar Content:** Modify `DecisionTreeVisual.tsx` sidebar section
3. **Layout:** Adjust `react-organizational-chart` props (lineWidth, lineColor, etc.)
4. **Colors:** Update Tailwind classes for your brand
5. **Tree Generation:** Edit system prompt in `app/api/generate-tree/route.ts`

## Performance Tips

**Current Implementation:**
- Renders well up to ~50 nodes
- Use `useMemo` for expensive calculations
- Lazy load sidebar content

**If Migrating to React Flow:**
- Use `nodesDraggable={false}` if not needed
- Enable `nodesFocusable={false}` for better performance
- Use `onlyRenderVisibleElements` for large trees
- Memoize custom node components

## Known Limitations

1. **Static Layout:** Nodes don't auto-reposition (by design, predictable)
2. **No Zoom/Pan:** Use React Flow for this
3. **Large Trees:** Best for < 50 nodes, use React Flow for 100+
4. **No Animations:** Consider React Flow for edge animations

## Resources

- [react-organizational-chart](https://github.com/daniel-hauser/react-organizational-chart)
- [React Flow](https://reactflow.dev/)
- [Dagre (auto-layout)](https://github.com/dagrejs/dagre)
- [ELK (advanced layout)](https://www.eclipse.org/elk/)

---

Built for AluminatiAI Hackathon 2024 • Powered by MiniMax M2.1
