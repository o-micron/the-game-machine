window.onload = function () {
  require.config({ paths: { vs: "machine/js/min/vs" } });
  require(["vs/editor/editor.main"], function () {
    var path = "https://gist.githubusercontent.com/o-micron/dfa39e0742b97323709b87295f8f6b1b/raw/3a6222090c0b033119e12b67b6aac724680c0910/Purple.json";
    fetch(path)
      .then((r) => r.json())
      .then((data) => {
        monaco.editor.defineTheme("Amy", data);
        gameMachineEditor = new GameMachineEditor();
        game_render();
      });
  });
};

main_canvas.onmousedown = function (e) {
  mouse_down = true;
  game_paint(e);
};

main_canvas.onmousemove = function (e) {
  game_paint(e);
};

window.onmouseup = main_canvas.onmouseup = function (e) {
  mouse_down = false;
};
