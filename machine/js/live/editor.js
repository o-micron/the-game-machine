// -------------------------------------------------------
// GAME MACHINE
// -------------------------------------------------------
var show_renderer = false;
var that = null;

(function () {
  var canvas_parent = document.getElementById("canvas-parent");
  var canvas_shell = document.getElementById("iframe-shell");
  var canvas_renderer = document.getElementById("canvas-renderer");
  var game_tabs = document.getElementById("game-tabs");
  canvas_shell.width = canvas_parent.offsetWidth;
  canvas_shell.height = canvas_parent.offsetHeight - game_tabs.clientHeight;
  canvas_renderer.width = canvas_parent.offsetWidth;
  canvas_renderer.height = canvas_parent.offsetHeight - game_tabs.clientHeight;

  var pg = document.getElementById("playground");
  var tb = document.getElementById("editor-tabs");
  var pt = document.getElementById("editor-tabs-parent");
  var a = pt.offsetHeight;
  var b = tb.offsetHeight;
  pg.style.height = a - b + "px";
  $("#playground div:first-child").addClass("h-100");
})();

class GameMachineEditor {
  constructor() {
    this.editor = null;
    this.data = {
      c: {
        name: "c",
        model: null,
        state: null,
        downloaded: false,
      },
      js: {
        name: "js",
        model: null,
        state: null,
        downloaded: false,
      },
      python: {
        name: "python",
        model: null,
        state: null,
        downloaded: false,
      },
    };
    this.data.c.model = monaco.editor.createModel(c_source(), "c");
    this.data.js.model = monaco.editor.createModel(js_source(), "javascript");
    this.data.python.model = monaco.editor.createModel(py_source(), "python");
    this.li_id = "c-ui-li";
    this.a_id = "c-ui-a";
    this.programmingLanguage = this.data.c;
    var playground = document.getElementById("playground");

    this.editor = monaco.editor.create(playground, {
      model: this.data.c.model,
      minimap: {
        enabled: false,
      },
      roundedSelection: false,
      scrollBeyondLastLine: false,
      theme: "Amy",
    });

    this.binding = this.editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S,
      function () {
        onEditorBuild();
      }
    );

    this.getProgrammingLanguage = function () {
      return this.programmingLanguage.name;
    };

    this.hasCompiler = function () {
      return this.programmingLanguage.downloaded === true;
    };

    this.download = () => {
      var tmpo = this;
      var cmd = "";
      if (this.programmingLanguage === this.data.c) {
        cmd = "wapm install clang";
      } else if (this.programmingLanguage === this.data.js) {
        cmd = "wapm install quickjs";
      } else if (this.programmingLanguage === this.data.python) {
        cmd = "wapm install python";
      } else {
        return new Promise((resolve, reject) => {
          reject("");
        });
      }
      return new Promise((resolve, reject) => {
        onBeginDownloadAnimation();
        execute(cmd)
          .then((result) => {
            this.programmingLanguage.downloaded = true;
            onEndAnimation();
            resolve("");
          })
          .catch((err) => {
            reject("");
          });
      });
    };

    this.generate_headers = () => {
      var currentModel = this.editor.getModel();
      if (currentModel === this.data.c.model) {
        writeFile("gamemachine.h", c_header(dimensions));
      } else if (currentModel === this.data.js.model) {
        writeFile("gamemachine.js", js_header(dimensions));
      } else if (currentModel === this.data.python.model) {
        writeFile("gamemachine.py", py_header(dimensions));
      }
    };

    this.build = () => {
      this.generate_headers();
      var currentState = this.editor.saveViewState();
      var currentModel = this.editor.getModel();
      if (currentModel === this.data.c.model) {
        let previouslyBuilt = ["main.o", "main.wasm"];
        let objectFilesArray = listFiles("./", "main.*\\.o.*");
        previouslyBuilt.push.apply(previouslyBuilt, objectFilesArray);
        cleanBuildFiles(previouslyBuilt);
        var cmd =
          "wapm run clang -cc1 -triple wasm32-unkown-wasi -isysroot /sys -internal-isystem /sys/include -emit-obj ./main.c -o ./main.o";
        return new Promise((resolve, reject) => {
          onBeginBuildingAnimation();
          execute(cmd).then((result) => {
            let objectFiles = listFiles("./", "main.*\\.o.*").join(" ");
            cmd =
              "wapm run wasm-ld -L/sys/lib/wasm32-wasi /sys/lib/wasm32-wasi/crt1.o " +
              objectFiles +
              " -lc -o ./main.wasm ";
            execute(cmd).then((result) => {
              onEndAnimation();
              resolve("");
            });
          });
        });
      } else if (currentModel === this.data.js.model) {
        return new Promise((resolve, reject) => {
          resolve("");
        });
      } else if (currentModel === this.data.python.model) {
        return new Promise((resolve, reject) => {
          resolve("");
        });
      }
    };

    this.run = () => {
      var cmd = "";
      if (this.programmingLanguage === this.data.c) {
        var cmd = "./main.wasm";
      } else if (this.programmingLanguage === this.data.js) {
        var cmd = "qjs --std ./main.js";
      } else if (this.programmingLanguage === this.data.python) {
        var cmd = "python ./main.py";
      } else {
        return new Promise((resolve, reject) => {
          reject("");
        });
      }
      return execute(cmd);
    };

    this.changeTab = (lang) => {
      var currentState = this.editor.saveViewState();
      var currentModel = this.editor.getModel();
      if (currentModel === this.data.c.model) {
        this.data.c.state = currentState;
      } else if (currentModel === this.data.js.model) {
        this.data.js.state = currentState;
      } else if (currentModel === this.data.python.model) {
        this.data.python.state = currentState;
      }

      $("#" + this.li_id).removeClass("active");
      $("#" + this.a_id).removeClass("active");
      if (lang === "c") {
        this.programmingLanguage = this.data.c;
        this.editor.setModel(this.data.c.model);
        this.editor.restoreViewState(this.data.c.state);
        this.editor.focus();
        this.li_id = "c-ui-li";
        this.a_id = "c-ui-a";
      } else if (lang === "javascript") {
        this.programmingLanguage = this.data.js;
        this.editor.setModel(this.data.js.model);
        this.editor.restoreViewState(this.data.js.state);
        this.editor.focus();
        this.li_id = "js-ui-li";
        this.a_id = "js-ui-a";
      } else if (lang === "python") {
        this.programmingLanguage = this.data.python;
        this.editor.setModel(this.data.python.model);
        this.editor.restoreViewState(this.data.python.state);
        this.editor.focus();
        this.li_id = "python-ui-li";
        this.a_id = "python-ui-a";
      }
      $("#" + this.li_id).addClass("active");
      $("#" + this.a_id).addClass("active");
    };
  }
}

let gameMachineEditor = null;

function onEditorTabChange(lang) {
  gameMachineEditor.changeTab(lang);
}

async function onEditorRun() {
  writeFile(".bashrc", "DIMENSIONS=" + dimensions);
  if (show_renderer) {
    onCanvasSwitch();
  }
  await execute("env -f .bashrc");
  return gameMachineEditor.run();
}

async function onEditorBuild() {
  if (show_renderer) {
    onCanvasSwitch();
  }
  if (gameMachineEditor.hasCompiler()) {
    var filename = "";
    if (gameMachineEditor.programmingLanguage === gameMachineEditor.data.c) {
      filename = "main.c";
    } else if (
      gameMachineEditor.programmingLanguage === gameMachineEditor.data.js
    ) {
      filename = "main.js";
    } else if (
      gameMachineEditor.programmingLanguage === gameMachineEditor.data.python
    ) {
      filename = "main.py";
    }
    writeFile(filename, gameMachineEditor.editor.getValue());
    return gameMachineEditor.build();
  } else {
    return new Promise((resolve, reject) => {
      onDownloadPrompt(gameMachineEditor.getProgrammingLanguage())
        .then((result) => {
          gameMachineEditor
            .download()
            .then((result) => {
              onEditorBuild().then((result) => {
                resolve("");
              });
            })
            .catch((err) => {
              reject(err);
            });
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}

function onCanvasSwitch() {
  var canvas_parent = document.getElementById("canvas-parent");
  var canvas_shell = document.getElementById("iframe-shell");
  var canvas_renderer = document.getElementById("canvas-renderer");
  var canvas_btn = document.getElementById("canvas-btn-glyph");
  var game_tabs = document.getElementById("game-tabs");
  canvas_btn.blur();
  show_renderer = !show_renderer;
  if (show_renderer) {
    // game_tabs.classList.remove("d-none");
    game_tabs.width = canvas_renderer.width;
    canvas_renderer.height = canvas_shell.height;
    canvas_renderer.classList.remove("d-none");
    canvas_shell.classList.add("d-none");
    canvas_btn.classList.remove("fa-gamepad");
    canvas_btn.classList.add("fa-terminal");
    game_render();
  } else {
    // game_tabs.classList.add("d-none");
    game_tabs.width = canvas_renderer.width;
    canvas_shell.height = canvas_renderer.height;
    canvas_shell.classList.remove("d-none");
    canvas_renderer.classList.add("d-none");
    canvas_btn.classList.remove("fa-terminal");
    canvas_btn.classList.add("fa-gamepad");
    game_resize(canvas_parent.offsetWidth, canvas_shell.height);
  }
}

function onFileUpload() {}

async function onDownloadPrompt(lang) {
  return new Promise((resolve, reject) => {
    $("#downloadModal").modal({
      focus: true,
      show: true,
    });
    $("#downloadModal #modal-accept").click(function () {
      resolve("");
    });
    $("#downloadModal #modal-cancel").click(function () {
      reject("");
    });
  });
}

// function onDownloadPromptAccept() {
//   if (show_renderer) {
//     onCanvasSwitch();
//   }
//   gameMachineEditor.download().then(async (result) => {
//     await onEditorBuild();
//   });
// }

function onBeginBuildingAnimation() {
  var buildBtn = document.getElementById("build-btn");
  buildBtn.blur();
  buildBtn.classList.add("animated", "rotateIn");
  buildBtn.classList.add("animation-duration", "30s");
  buildBtn.classList.add("animation-delay", "30s");
  buildBtn.classList.add("animation-iteration-count", "infinite");
  var buildBtnGlyph = document.getElementById("build-btn-glyph");
}

function onBeginDownloadAnimation() {
  var buildBtn = document.getElementById("build-btn");
  buildBtn.blur();
  buildBtn.classList.add("animated", "fadeIn");
  buildBtn.classList.add("animation-duration", "30s");
  buildBtn.classList.add("animation-delay", "30s");
  buildBtn.classList.add("animation-iteration-count", "infinite");
  var buildBtnGlyph = document.getElementById("build-btn-glyph");
  buildBtnGlyph.classList.remove("fa-hammer");
  buildBtnGlyph.classList.add("fa-angle-double-down");
}

function onEndAnimation() {
  var buildBtn = document.getElementById("build-btn");
  buildBtn.blur();
  buildBtn.classList.remove("animated", "rotateIn", "fadeIn");
  buildBtn.classList.remove("animation-iteration-count");
  var buildBtnGlyph = document.getElementById("build-btn-glyph");
  buildBtnGlyph.classList.add("fa-hammer");
}

function onUpdateDimensions() {
  var inp = document.getElementById("dimensions-input");
  var ind = document.getElementById("dimensions-indicator");
  dimensions = inp.value;
  ind.textContent = dimensions + "x" + dimensions;
  set_reset();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForExecution() {
  while (
    document.getElementById("iframe-shell").contentWindow.that.wapm.wasmTerminal
      .wasmTty._input !== ""
  ) {
    await sleep(1000);
  }
}

function cleanBuildFiles(files) {
  files.forEach((file) => {
    try {
      document
        .getElementById("iframe-shell")
        .contentWindow.that.wasmFs.fs.unlinkSync(file);
    } catch (err) {
      // alert(err);
    }
  });
}

function readFile(filename) {
  try {
    return document
      .getElementById("iframe-shell")
      .contentWindow.that.wasmFs.fs.readFileSync(filename, "utf-8");
  } catch (err) {
    // alert(err);
    return null;
  }
}

function fileExists(filename) {
  try {
    return document
      .getElementById("iframe-shell")
      .contentWindow.that.wasmFs.fs.existsSync(filename);
  } catch (err) {
    // alert(err);
    return false;
  }
}

function writeFile(filename, content) {
  try {
    document
      .getElementById("iframe-shell")
      .contentWindow.that.wasmFs.fs.writeFileSync(filename, content);
  } catch (err) {
    // alert(err);
  }
}

function listFiles(folder, matchingExpr) {
  let result = [];
  document
    .getElementById("iframe-shell")
    .contentWindow.that.wasmFs.fs.readdirSync(folder)
    .forEach((file) => {
      if (file.match(new RegExp(matchingExpr, "g"))) {
        result.push(file);
      }
    });
  return result;
}

async function execute(str) {
  document
    .getElementById("iframe-shell")
    .contentWindow.that.wasmTerminal.runCommand(str);
  await waitForExecution();
}

$("#downloadModal").on("show.bs.modal", function (event) {
  var modal = $(this);
  modal
    .find("#model-body-content")
    .text(
      "- " +
        gameMachineEditor.getProgrammingLanguage() +
        " programming language"
    );
});

function BindWasmTerminal(module) {
  that = module;
}
// -------------------------------------------------------
