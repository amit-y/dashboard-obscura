const layoutNodes = (
  parentWidth,
  parentHeight,
  childCount,
  childWidth = 550,
  childHeight = 300,
  gap = 100,
  iterations = 200,
  repulsion = 0.5,
  centering = 0.1,
  damping = 0.9,
) => {
  const nodes = Array.from({ length: childCount }, () => ({
    x: Math.random() * (parentWidth - childWidth),
    y: Math.random() * (parentHeight - childHeight),
    vx: 0,
    vy: 0,
  }));

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < childCount; i++) {
      for (let j = i + 1; j < childCount; j++) {
        const A = nodes[i],
          B = nodes[j];
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const overlapX = childWidth + gap - Math.abs(dx);
        const overlapY = childHeight + gap - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          const nx =
            dx === 0 ? (Math.random() > 0.5 ? 1 : -1) : dx / Math.abs(dx);
          const ny =
            dy === 0 ? (Math.random() > 0.5 ? 1 : -1) : dy / Math.abs(dy);
          const fx = nx * overlapX * repulsion;
          const fy = ny * overlapY * repulsion;
          A.vx -= fx;
          A.vy -= fy;
          B.vx += fx;
          B.vy += fy;
        }
      }
    }

    const centerX = parentWidth / 2 - childWidth / 2;
    const centerY = parentHeight / 2 - childHeight / 2;
    for (const n of nodes) {
      n.vx += (centerX - n.x) * centering;
      n.vy += (centerY - n.y) * centering;
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  return nodes.map((n) => ({
    position: {
      x: n.x,
      y: n.y,
    },
    width: childWidth,
    height: childHeight,
  }));
};

export { layoutNodes };
