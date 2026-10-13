import { image, makeCanvas, cells, fitRect } from "./core.js";
export function clampCrop(crop) {
  const w = Math.max(0.05, Math.min(1, crop.w)),
    h = Math.max(0.05, Math.min(1, crop.h));
  return {
    x: Math.max(0, Math.min(1 - w, crop.x)),
    y: Math.max(0, Math.min(1 - h, crop.y)),
    w,
    h,
  };
}
export function scaleFrame(frame, scale) {
  const w = frame.w * scale,
    h = frame.h * scale;
  return {
    x: frame.x + (frame.w - w) / 2,
    y: frame.y + (frame.h - h) / 2,
    w,
    h,
  };
}
export async function createComposeEditor(
  host,
  blobs,
  onChange = () => {},
  { bounded = false, snap = false } = {},
) {
  const bitmaps = [];
  try {
    for (const blob of blobs) bitmaps.push(await image(blob));
  } catch (error) {
    bitmaps.forEach((b) => b.close());
    throw error;
  }
  let board = { w: 1190, h: 1684 },
    frames = [],
    crops = blobs.map(() => ({ x: 0, y: 0, w: 1, h: 1 })),
    active = 0,
    zOrder = [0, 1],
    gesture = null,
    cropMode = false,
    disposed = false,
    inset = 35,
    guides = [];
  const canvas = makeCanvas(board.w, board.h);
  canvas.id = "compose-canvas";
  canvas.setAttribute(
    "aria-label",
    "اسحب الصورة لتحريكها أو اسحب مقبض الزاوية لتغيير حجمها",
  );
  canvas.tabIndex = 0;
  host.replaceChildren(canvas);
  const pointers = new Map();
  function sourceRect(i) {
    const b = bitmaps[i],
      c = crops[i];
    return {
      x: c.x * b.width,
      y: c.y * b.height,
      w: c.w * b.width,
      h: c.h * b.height,
    };
  }
  function draw(output = canvas, decorations = true) {
    const ctx = output.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, output.width, output.height);
    zOrder.forEach((i) => {
      const f = frames[i],
        s = sourceRect(i);
      ctx.drawImage(bitmaps[i], s.x, s.y, s.w, s.h, f.x, f.y, f.w, f.h);
    });
    if (decorations && guides.length) {
      ctx.strokeStyle = "#3764ed";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      for (const g of guides) {
        ctx.beginPath();
        if (g.axis === "x") {
          ctx.moveTo(g.value, 0);
          ctx.lineTo(g.value, board.h);
        } else {
          ctx.moveTo(0, g.value);
          ctx.lineTo(board.w, g.value);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    if (decorations && frames[active]) {
      const f = frames[active],
        line = Math.max(3, board.w / 250),
        handle =
          (board.w * 24) / Math.max(1, canvas.getBoundingClientRect().width);
      ctx.strokeStyle = "#137a5b";
      ctx.lineWidth = line;
      ctx.setLineDash([board.w / 70, board.w / 100]);
      ctx.strokeRect(f.x, f.y, f.w, f.h);
      ctx.setLineDash([]);
      ctx.fillStyle = "#137a5b";
      ctx.fillRect(
        f.x + f.w - handle / 2,
        f.y + f.h - handle / 2,
        handle,
        handle,
      );
      ctx.font = `bold ${board.w / 28}px Arial`;
      ctx.fillText(String(active + 1), f.x + line * 3, f.y + board.w / 28);
    }
  }
  function constrain(f) {
    if (!bounded) return f;
    const scale = Math.min(1, board.w / f.w, board.h / f.h);
    const next = scaleFrame(f, scale);
    return {
      ...next,
      x: Math.max(0, Math.min(board.w - next.w, next.x)),
      y: Math.max(0, Math.min(board.h - next.h, next.y)),
    };
  }
  function changed() {
    if (disposed) return;
    if (bounded) frames = frames.map(constrain);
    draw();
    onChange({
      active,
      frames: frames.map((f) => ({ ...f })),
      crops: crops.map((c) => ({ ...c })),
      board: { ...board },
    });
  }
  function point(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * board.w) / r.width,
      y: ((e.clientY - r.top) * board.h) / r.height,
    };
  }
  function hit(p, f) {
    return p.x >= f.x && p.x <= f.x + f.w && p.y >= f.y && p.y <= f.y + f.h;
  }
  function down(e) {
    if (cropMode) return;
    e.preventDefault();
    const p = point(e);
    pointers.set(e.pointerId, p);
    canvas.setPointerCapture(e.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      gesture = {
        mode: "pinch",
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        frame: { ...frames[active] },
      };
      return;
    }
    const f = frames[active],
      r = (board.w * 24) / Math.max(1, canvas.getBoundingClientRect().width);
    const corner = f && Math.hypot(p.x - f.x - f.w, p.y - f.y - f.h) < r;
    if (!corner) {
      const index = hit(p, frames[active])
        ? active
        : zOrder.filter((i) => hit(p, frames[i])).at(-1);
      if (index === undefined) {
        pointers.clear();
        return;
      }
      active = index;
    }
    gesture = {
      mode: corner ? "resize" : "move",
      start: p,
      frame: { ...frames[active] },
    };
    changed();
  }
  function move(e) {
    if (!pointers.has(e.pointerId) || !gesture) return;
    e.preventDefault();
    const p = point(e);
    pointers.set(e.pointerId, p);
    const g = gesture,
      f = g.frame;
    if (g.mode === "pinch" && pointers.size === 2) {
      const [a, b] = [...pointers.values()],
        ratio = Math.max(
          0.15,
          Math.min(6, Math.hypot(a.x - b.x, a.y - b.y) / g.distance),
        );
      frames[active] = scaleFrame(f, ratio);
    } else if (g.mode === "move") {
      frames[active] = {
        ...f,
        x: Math.max(
          -f.w * 0.9,
          Math.min(board.w - f.w * 0.1, f.x + p.x - g.start.x),
        ),
        y: Math.max(
          -f.h * 0.9,
          Math.min(board.h - f.h * 0.1, f.y + p.y - g.start.y),
        ),
      };
    } else if (g.mode === "resize") {
      const ratio = Math.max(
        0.15,
        Math.min(
          6,
          ((p.x - f.x) * f.w + (p.y - f.y) * f.h) / (f.w * f.w + f.h * f.h),
        ),
      );
      frames[active] = { ...f, w: f.w * ratio, h: f.h * ratio };
    }
    if (snap && g.mode === "move") {
      guides = [];
      const f = frames[active],
        other = frames[1 - active],
        threshold =
          (board.w * 6) / Math.max(1, canvas.getBoundingClientRect().width);
      for (const [axis, size] of [
        ["x", "w"],
        ["y", "h"],
      ]) {
        const dimension = axis === "x" ? board.w : board.h;
        const targets = [
          dimension / 2,
          ...(other
            ? [
                other[axis],
                other[axis] + other[size] / 2,
                other[axis] + other[size],
              ]
            : []),
        ];
        let best = null;
        for (const target of targets)
          for (const offset of [0, f[size] / 2, f[size]]) {
            const delta = target - f[axis] - offset;
            if (
              Math.abs(delta) < threshold &&
              (!best || Math.abs(delta) < Math.abs(best.delta))
            )
              best = { delta, target };
          }
        if (best) {
          f[axis] += best.delta;
          guides.push({ axis, value: best.target });
        }
      }
    }
    changed();
  }
  function up(e) {
    guides = [];
    changed();
    pointers.delete(e.pointerId);
    gesture = null;
    if (pointers.size === 1) {
      const start = [...pointers.values()][0];
      gesture = { mode: "move", start, frame: { ...frames[active] } };
    }
  }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.onkeydown = (e) => {
    const f = frames[active];
    if (!f) return;
    const delta = e.shiftKey ? 20 : 5,
      offset = {
        ArrowLeft: [-delta, 0],
        ArrowRight: [delta, 0],
        ArrowUp: [0, -delta],
        ArrowDown: [0, delta],
      }[e.key];
    if (offset) {
      e.preventDefault();
      f.x += offset[0];
      f.y += offset[1];
      changed();
    }
  };
  function preset({
    vertical = true,
    landscape = false,
    margin = 35,
    size = "a4",
    swap = false,
  } = {}) {
    inset = margin;
    guides = [];
    [board.w, board.h] = bounded
      ? landscape
        ? [1782, 1260]
        : [1260, 1782]
      : size === "letter"
        ? landscape
          ? [1584, 1224]
          : [1224, 1584]
        : landscape
          ? [1684, 1190]
          : [1190, 1684];
    canvas.width = board.w;
    canvas.height = board.h;
    const areas = cells(board.w, board.h, vertical, margin);
    frames = bitmaps.map((b, i) => {
      const c = crops[i];
      return fitRect(b.width * c.w, b.height * c.h, areas[swap ? 1 - i : i]);
    });
    changed();
  }
  function cropEditor(container) {
    cropMode = true;
    const i = active,
      b = bitmaps[i],
      view = makeCanvas(b.width, b.height),
      ctx = view.getContext("2d");
    view.id = "compose-crop-canvas";
    container.replaceChildren(view);
    let c = { ...crops[i] },
      drag = null;
    function pos(e) {
      const r = view.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
        y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
      };
    }
    function paint() {
      ctx.drawImage(b, 0, 0);
      ctx.fillStyle = "#102d2877";
      ctx.beginPath();
      ctx.rect(0, 0, b.width, b.height);
      ctx.rect(c.x * b.width, c.y * b.height, c.w * b.width, c.h * b.height);
      ctx.fill("evenodd");
      ctx.strokeStyle = "#58d7a8";
      ctx.lineWidth = Math.max(3, b.width / 180);
      ctx.strokeRect(
        c.x * b.width,
        c.y * b.height,
        c.w * b.width,
        c.h * b.height,
      );
      const radius = Math.max(b.width, b.height) / 50;
      for (const [x, y] of [
        [c.x, c.y],
        [c.x + c.w, c.y],
        [c.x + c.w, c.y + c.h],
        [c.x, c.y + c.h],
      ]) {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x * b.width, y * b.height, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    view.onpointerdown = (e) => {
      e.preventDefault();
      const p = pos(e),
        corners = [
          [c.x, c.y],
          [c.x + c.w, c.y],
          [c.x + c.w, c.y + c.h],
          [c.x, c.y + c.h],
        ],
        nearest = corners
          .map(([x, y], i) => ({ i, d: Math.hypot(p.x - x, p.y - y) }))
          .sort((a, b) => a.d - b.d)[0];
      drag = { p, base: { ...c }, corner: nearest.d < 0.11 ? nearest.i : -1 };
      view.setPointerCapture(e.pointerId);
    };
    view.onpointermove = (e) => {
      if (!drag) return;
      e.preventDefault();
      const p = pos(e),
        base = drag.base;
      if (drag.corner < 0)
        c = clampCrop({
          ...base,
          x: base.x + p.x - drag.p.x,
          y: base.y + p.y - drag.p.y,
        });
      else {
        let x0 = base.x,
          y0 = base.y,
          x1 = base.x + base.w,
          y1 = base.y + base.h;
        if ([0, 3].includes(drag.corner)) x0 = Math.min(x1 - 0.05, p.x);
        else x1 = Math.max(x0 + 0.05, p.x);
        if ([0, 1].includes(drag.corner)) y0 = Math.min(y1 - 0.05, p.y);
        else y1 = Math.max(y0 + 0.05, p.y);
        c = clampCrop({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
      }
      paint();
    };
    view.onpointerup = () => (drag = null);
    view.onpointercancel = () => (drag = null);
    paint();
    return {
      apply() {
        const old = frames[i];
        crops[i] = c;
        frames[i] = { ...old, h: (old.w * (b.height * c.h)) / (b.width * c.w) };
        cropMode = false;
        changed();
      },
      cancel() {
        cropMode = false;
      },
      reset() {
        c = { x: 0, y: 0, w: 1, h: 1 };
        paint();
      },
    };
  }
  preset();
  return {
    canvas,
    preset,
    setFrame(values) {
      const f = frames[active];
      if (Number.isFinite(values.x)) f.x = values.x;
      if (Number.isFinite(values.y)) f.y = values.y;
      if (Number.isFinite(values.w)) {
        const w = Math.max(board.w * 0.03, Math.min(board.w * 3, values.w));
        f.h *= w / f.w;
        f.w = w;
      }
      changed();
    },
    select(i) {
      active = i;
      changed();
    },
    zoom(ratio) {
      frames[active] = scaleFrame(frames[active], ratio);
      changed();
    },
    center() {
      const f = frames[active];
      f.x = (board.w - f.w) / 2;
      f.y = (board.h - f.h) / 2;
      changed();
    },
    cropEditor,
    front() {
      zOrder = zOrder.filter((i) => i !== active);
      zOrder.push(active);
      changed();
    },
    back() {
      zOrder = zOrder.filter((i) => i !== active);
      zOrder.unshift(active);
      changed();
    },
    resetCrop() {
      crops[active] = { x: 0, y: 0, w: 1, h: 1 };
      const b = bitmaps[active];
      frames[active].h = (frames[active].w * b.height) / b.width;
      changed();
    },
    rotate() {
      const i = active,
        b = bitmaps[i],
        c = crops[i],
        rotated = makeCanvas(b.height, b.width),
        ctx = rotated.getContext("2d");
      ctx.translate(rotated.width, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(b, 0, 0);
      rotated.close = () => {
        rotated.width = 1;
        rotated.height = 1;
      };
      b.close();
      bitmaps[i] = rotated;
      crops[i] = { x: 1 - c.y - c.h, y: c.x, w: c.h, h: c.w };
      const f = frames[i];
      frames[i] = {
        x: f.x + (f.w - f.h) / 2,
        y: f.y + (f.h - f.w) / 2,
        w: f.h,
        h: f.w,
      };
      changed();
    },
    fit(axis) {
      const f = frames[active],
        ratio =
          axis === "width"
            ? (board.w - 2 * inset) / f.w
            : (board.h - 2 * inset) / f.h;
      const scale = Math.min(
        ratio,
        (board.w - 2 * inset) / f.w,
        (board.h - 2 * inset) / f.h,
      );
      frames[active] = scaleFrame(f, scale);
      changed();
    },
    cardSize() {
      const s = sourceRect(active),
        w = board.w / (board.w < board.h ? 210 : 297),
        area = {
          x: frames[active].x,
          y: frames[active].y,
          w: 85.6 * w,
          h: 54 * w,
        };
      frames[active] = fitRect(s.w, s.h, area);
      changed();
    },
    equalize() {
      const width = Math.min(...frames.map((f) => f.w));
      frames = frames.map((f) => scaleFrame(f, width / f.w));
      changed();
    },
    swap() {
      const [a, b] = frames;
      frames = [
        { ...a, x: b.x + (b.w - a.w) / 2, y: b.y + (b.h - a.h) / 2 },
        { ...b, x: a.x + (a.w - b.w) / 2, y: a.y + (a.h - b.h) / 2 },
      ];
      changed();
    },
    exportCanvas(scale = 1) {
      const output = makeCanvas(
        Math.round(board.w * scale),
        Math.round(board.h * scale),
      );
      output.getContext("2d").scale(scale, scale);
      draw(output, false);
      return output;
    },
    destroy() {
      disposed = true;
      bitmaps.forEach((b) => b.close());
      pointers.clear();
      gesture = null;
    },
  };
}
