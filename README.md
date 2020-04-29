# the-game-machine
this is an attempt to create a game machine using web assembly.
This is possible using [wasmer](https://wasmer.io/) and [wapm](https://wapm.io/)

# Live website
https://game-machine.herokuapp.com/index.html

# a quick video
https://twitter.com/omarsheriffathy/status/1255252545653661698?s=20

# how it works
use any programming language you want that can be compiled to webassembly.

I have prepared a few examples in C, Javascript (QuickJs), Python and probably more {Swift, Lua} coming soon.

You can avoid waiting by compiling your code to a .wasm file and you can just drop the .wasm file in the shell.
see [https://wasmer.io/](https://wasmer.io/) for more details.

# the games
any upcoming game will provide you the needed info in `input.txt` and you have to write your output in `output.txt`

An example is found in the C example in the pathfinder game


# LICENSE
MIT LICENSE
