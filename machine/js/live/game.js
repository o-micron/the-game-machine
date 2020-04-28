let search_state = {
  obstacles: "OBSTACLES",
  start: "START",
  end: "END",
  search: "SEARCH",
};
let main_canvas = document.getElementById("canvas-renderer");
let context = main_canvas.getContext("2d");
let dimensions = 10.0;
let spacing = 0.01;
let bg_color = "#201842";
let grid_color = "#a4fc90";
let start_color = "#dbcc00";
let end_color = "#7882ff";
let obstacles_color = "#000";
let mouse_down = false;
let pixel_size = { x: 1.0, y: 1.0 };
let start_point = { col: 0.0, row: 0.0 };
let end_point = { col: dimensions - 1, row: dimensions - 1 };
let state = search_state.obstacles;
let nodes = generate_nodes();
let path = [];

function generate_nodes() {
  let nodes = [];
  for (let row = 0; row < dimensions; ++row) {
    for (let col = 0; col < dimensions; ++col) {
      nodes.push({
        col: col,
        row: row,
        is_obstacle: false,
      });
    }
  }
  return nodes;
}

function nodeAt(row, col) {
  return nodes[row * dimensions + col];
}

function lerpColor(a, b, amount) {
  var ah = parseInt(a.replace(/#/g, ""), 16),
    ar = ah >> 16,
    ag = (ah >> 8) & 0xff,
    ab = ah & 0xff,
    bh = parseInt(b.replace(/#/g, ""), 16),
    br = bh >> 16,
    bg = (bh >> 8) & 0xff,
    bb = bh & 0xff,
    rr = ar + amount * (br - ar),
    rg = ag + amount * (bg - ag),
    rb = ab + amount * (bb - ab);
  return (
    "#" + (((1 << 24) + (rr << 16) + (rg << 8) + rb) | 0).toString(16).slice(1)
  );
}

function set_obstacles() {
  state = search_state.obstacles;
}

function set_start() {
  state = search_state.start;
}

function set_end() {
  state = search_state.end;
}

function set_reset() {
  set_obstacles();
  path = [];
  nodes = null;
  start_point = { col: 0.0, row: 0.0 };
  end_point = { col: dimensions - 1, row: dimensions - 1 };
  nodes = generate_nodes();
  game_render();
}

function syncMapFromCanvas() {
  var content = "";
  for (let row = 0; row < dimensions; ++row) {
    for (let col = 0; col < dimensions; ++col) {
      let node = nodes[row * dimensions + col];
      if (node.is_obstacle) {
        content += "w";
      } else if (node.col === start_point.col && node.row === start_point.row) {
        content += "s";
      } else if (node.col === end_point.col && node.row === end_point.row) {
        content += "e";
      } else {
        content += "a";
      }
    }
  }
  writeFile("output.txt", "");
  writeFile("input.txt", content);
}

function updateMapFromProgram() {
  path = [];
  game_render();
  var content = readFile("output.txt");
  var lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let ratio = 1.0 - (i * 1.0) / lines.length;
    let color = lerpColor(start_color, end_color, ratio);
    var point = lines[i].split(" ");
    path.push({
      col: parseInt(point[0]),
      row: parseInt(point[1]),
      color: color,
    });
  }
}

function set_search() {
  syncMapFromCanvas();
  onEditorBuild().then((result) => {
    onEditorRun().then((result) => {
      updateMapFromProgram();
      if (!show_renderer) {
        onCanvasSwitch();
      }
      setTimeout(() => {
        for (let i = 0; i < path.length; i++) {
          scratch({ col: path[i].col, row: path[i].row }, path[i].color);
        }
      }, 1000);
    });
  });
}

function scratch(pixel, color = null) {
  if (color == null) {
    if (pixel.col == NaN || pixel.row == NaN) {
      return;
    }
    switch (state) {
      case search_state.obstacles:
        context.fillStyle = obstacles_color;
        nodeAt(pixel.row, pixel.col).is_obstacle = true;
        break;

      case search_state.start:
        if (start_point !== null) {
          context.fillStyle = bg_color;
          context.fillRect(
            start_point.col * pixel_size.x,
            start_point.row * pixel_size.y,
            pixel_size.x,
            pixel_size.y
          );
          context.strokeStyle = grid_color;
          context.strokeRect(
            start_point.col * pixel_size.x,
            start_point.row * pixel_size.y,
            pixel_size.x,
            pixel_size.y
          );
        }
        start_point = pixel;
        nodeAt(pixel.row, pixel.col).is_obstacle = false;
        context.fillStyle = start_color;
        break;

      case search_state.end:
        if (end_point !== null) {
          context.fillStyle = bg_color;
          context.fillRect(
            end_point.col * pixel_size.x,
            end_point.row * pixel_size.y,
            pixel_size.x,
            pixel_size.y
          );
          context.strokeStyle = grid_color;
          context.strokeRect(
            end_point.col * pixel_size.x,
            end_point.row * pixel_size.y,
            pixel_size.x,
            pixel_size.y
          );
        }
        end_point = pixel;
        nodeAt(pixel.row, pixel.col).is_obstacle = false;
        context.fillStyle = end_color;
        break;

      case search_state.search:
        return;
    }
  } else {
    context.fillStyle = color;
  }
  context.fillRect(
    pixel.col * pixel_size.x,
    pixel.row * pixel_size.y,
    pixel_size.x,
    pixel_size.y
  );
}

function game_resize(w, h) {
  main_canvas.offsetWidth = w;
  main_canvas.offsetHeight = h;
  main_canvas.width = w;
  main_canvas.height = h;
}

function game_render() {
  let w = main_canvas.width;
  let h = main_canvas.height;
  context.clearRect(0, 0, w, h);
  pixel_size.x = w / dimensions;
  pixel_size.y = h / dimensions;
  context.strokeStyle = grid_color;
  for (let i = 0; i < nodes.length; ++i) {
    if (nodes[i].is_obstacle === true) {
      scratch({ col: nodes[i].col, row: nodes[i].row }, obstacles_color);
    } else {
      scratch({ col: nodes[i].col, row: nodes[i].row }, bg_color);
    }
  }
  for (let i = 0; i < path.length; i++) {
    scratch({ row: path[i].row, col: path[i].col }, path[i].color);
  }
  for (let y = 0; y <= dimensions; y++) {
    context.beginPath();
    context.moveTo(0, y * pixel_size.y);
    context.lineTo(w, y * pixel_size.y);
    context.stroke();
  }
  for (let x = 0; x <= dimensions; x++) {
    context.beginPath();
    context.moveTo(x * pixel_size.x, 0);
    context.lineTo(x * pixel_size.x, h);
    context.stroke();
  }
  if (start_point !== null) {
    scratch(start_point, start_color);
  }
  if (end_point !== null) {
    scratch(end_point, end_color);
  }
}

function game_paint(e) {
  if (mouse_down) {
    var rect = main_canvas.getBoundingClientRect();
    let offset = {
      col: Math.floor(
        ((e.clientX - rect.left) / main_canvas.width) * dimensions
      ),
      row: Math.floor(
        ((e.clientY - rect.top) / main_canvas.height) * dimensions
      ),
    };
    scratch(offset);
  }
}
