import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "https://tree-hierarchy-parser-api.onrender.com";

// Recursively render a nested tree object as an indented list
function TreeNode({ name, children, depth = 0 }) {
  const [open, setOpen] = useState(true);
  const hasChildren = children && Object.keys(children).length > 0;

  return (
    <div className="tree-node" style={{ paddingLeft: depth === 0 ? 0 : "20px" }}>
      <div
        className={`tree-label ${hasChildren ? "has-children" : ""}`}
        onClick={() => hasChildren && setOpen(o => !o)}
      >
        {hasChildren && (
          <span className="toggle">{open ? "▾" : "▸"}</span>
        )}
        {!hasChildren && <span className="leaf-dot">●</span>}
        <span className="node-name">{name}</span>
      </div>
      {hasChildren && open && (
        <div className="tree-children">
          {Object.entries(children).map(([child, grandchildren]) => (
            <TreeNode key={child} name={child} children={grandchildren} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function HierarchyCard({ h, index }) {
  const treeRoot = h.tree && Object.keys(h.tree).length > 0 ? Object.keys(h.tree)[0] : null;

  return (
    <div className={`hierarchy-card ${h.has_cycle ? "cycle-card" : ""}`}>
      <div className="card-header">
        <span className="card-index">#{index + 1}</span>
        <span className="card-root">Root: <strong>{h.root}</strong></span>
        {h.has_cycle ? (
          <span className="badge cycle-badge">⚠ Cycle</span>
        ) : (
          <span className="badge tree-badge">🌿 Tree · depth {h.depth}</span>
        )}
      </div>
      <div className="card-body">
        {h.has_cycle ? (
          <p className="cycle-msg">This group contains a cycle — no tree structure available.</p>
        ) : treeRoot ? (
          <TreeNode name={treeRoot} children={h.tree[treeRoot]} />
        ) : (
          <p className="cycle-msg">Empty tree</p>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) {
      setError("Please enter at least one node.");
      return;
    }
    try {
      setError("");
      setResult(null);
      setLoading(true);
      const arr = input.split(",").map(item => item.trim()).filter(Boolean);
      const res = await axios.post(`${API_URL}/bfhl`, { data: arr });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "API call failed. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === "Enter") handleSubmit();
  };

  return (
    <div className="page">
      <div className="app-wrapper">
        {/* Header */}
        <header className="app-header">
          <div className="header-icon">🌳</div>
          <div>
            <h1>Tree Hierarchy Parser</h1>
            <p className="subtitle">Enter node edges and visualize the tree structure</p>
          </div>
        </header>

        {/* Input Section */}
        <section className="input-section">
          <label className="input-label">
            Node Edges
            <span className="hint">Comma-separated, e.g. A-&gt;B, A-&gt;C, B-&gt;D</span>
          </label>
          <textarea
            rows={4}
            placeholder="A->B, A->C, B->D, X->Y, Y->Z, Z->X"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="spinner" /> : "Submit"}
          </button>
          {error && <div className="error-box">⚠ {error}</div>}
        </section>

        {/* Results */}
        {result && (
          <section className="results-section">

            {/* Identity */}
            <div className="identity-row">
              <div className="identity-chip">👤 {result.user_id}</div>
              <div className="identity-chip">✉ {result.email_id}</div>
              <div className="identity-chip">🎓 {result.college_roll_number}</div>
            </div>

            {/* Summary */}
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-value">{result.summary.total_trees}</div>
                <div className="summary-label">Valid Trees</div>
              </div>
              <div className="summary-card">
                <div className="summary-value">{result.summary.total_cycles}</div>
                <div className="summary-label">Cycles</div>
              </div>
              <div className="summary-card highlight">
                <div className="summary-value">{result.summary.largest_tree_root || "—"}</div>
                <div className="summary-label">Largest Tree Root</div>
              </div>
            </div>

            {/* Hierarchies */}
            <h2 className="section-title">Hierarchies</h2>
            <div className="hierarchies-list">
              {result.hierarchies.map((h, i) => (
                <HierarchyCard key={i} h={h} index={i} />
              ))}
            </div>

            {/* Invalid & Duplicates */}
            <div className="meta-row">
              <div className="meta-box">
                <h3>Invalid Entries <span className="count">{result.invalid_entries.length}</span></h3>
                {result.invalid_entries.length === 0
                  ? <p className="empty-msg">None</p>
                  : <div className="tag-list">
                      {result.invalid_entries.map((e, i) => (
                        <span key={i} className="tag invalid-tag">{e || '""'}</span>
                      ))}
                    </div>
                }
              </div>
              <div className="meta-box">
                <h3>Duplicate Edges <span className="count">{result.duplicate_edges.length}</span></h3>
                {result.duplicate_edges.length === 0
                  ? <p className="empty-msg">None</p>
                  : <div className="tag-list">
                      {result.duplicate_edges.map((e, i) => (
                        <span key={i} className="tag dup-tag">{e}</span>
                      ))}
                    </div>
                }
              </div>
            </div>

          </section>
        )}
      </div>
    </div>
  );
}
