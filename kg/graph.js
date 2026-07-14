
(async function() {
  async function fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }

  function nodeColor(d) {
    if (d.kind === "page") return "#d94d2a";
    return "#2a7bd9";
  }

  function nodeRadius(d) {
    if (d.kind === "page") return 6;
    const s = Math.max(0, Math.min(24, (d.score || 0)));
    return 5 + Math.sqrt(s);
  }

  function nodeHref(d) {
    const base = (window.location.pathname.split("/")[1] || "kg");
    if (d.kind === "page") return `/${base}/pages/${encodeURIComponent(d.slug)}/`;
    return `/${base}/entities/${encodeURIComponent(d.safe || d.entity_id)}/`;
  }

  const el = document.getElementById("kg-graph");
  if (!el) return;
  const w = el.clientWidth || 900;
  const h = el.clientHeight || 600;

  let data;
  try {
    data = await fetchJSON("./graph-data.json");
  } catch (e) {
    el.innerHTML = "<div style='padding:12px'>Failed to load graph-data.json</div>";
    return;
  }

  const nodes = data.nodes || [];
  const edges = data.edges || [];

  const svg = d3.select(el).append("svg").attr("width", w).attr("height", h);
  const g = svg.append("g");
  svg.call(d3.zoom().on("zoom", (event) => g.attr("transform", event.transform)));

  const link = g.append("g")
    .attr("stroke", "rgba(0,0,0,0.18)")
    .attr("stroke-width", 1)
    .selectAll("line")
    .data(edges)
    .join("line")
    .attr("stroke-opacity", (e) => e.kind === "links" ? 0.45 : 0.25);

  const node = g.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", nodeRadius)
    .attr("fill", nodeColor)
    .attr("stroke", "rgba(255,255,255,0.7)")
    .attr("stroke-width", 1.2)
    .style("cursor", "pointer")
    .on("click", (event, d) => { window.location.href = nodeHref(d); });

  const label = g.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text((d) => d.label)
    .attr("font-size", 10)
    .attr("fill", "rgba(0,0,0,0.6)")
    .attr("pointer-events", "none");

  const sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(edges).id((d) => d.id).strength(0.2).distance((e) => e.kind === "links" ? 90 : 70))
    .force("charge", d3.forceManyBody().strength(-140))
    .force("center", d3.forceCenter(w / 2, h / 2))
    .force("collide", d3.forceCollide().radius((d) => nodeRadius(d) + 6).iterations(2));

  node.call(
    d3.drag()
      .on("start", (event, d) => { if (!event.active) sim.alphaTarget(0.25).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on("end", (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
  );

  sim.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    label.attr("x", (d) => d.x + 10).attr("y", (d) => d.y + 3);
  });
})();
