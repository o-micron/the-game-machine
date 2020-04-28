function c_header(dimensions) {
  return `#ifndef game_machine_header
#define game_machine_header

#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include <stddef.h>

static const int DIMENSIONS = ${dimensions};
static char GRID[DIMENSIONS * DIMENSIONS] = { 'a' };
static FILE* inputFile;
static FILE* outputFile;

int OPEN_READ_GRID() {
    inputFile = fopen("input.txt", "rb");
    if (inputFile == NULL) {
        printf("couldn't open read grid stream.\\n");
        return -1;
    } else {
        return 0;
    }
}

void READ_GRID()
{
    size_t i = 0;
    char c;
    while ((c = getc(inputFile)) != EOF) {
        if(c == EOF) break;
        if(c == '\\n') continue;
        GRID[i++] = c;
    }
}

void CLOSE_READ_GRID() {
    fclose(inputFile);
}

int OPEN_WRITE_GRID() {
    outputFile = fopen("output.txt", "wb");
    if (outputFile == NULL) {
        printf("couldn't open write grid stream.\\n");
        return -1;
    } else {
        return 0;
    }
}

void WRITE_GRID(int x, int y)
{
    fprintf(outputFile, "%i %i\\n", x, y);
}

void CLOSE_WRITE_GRID() {
    fclose(outputFile);
}

#endif // game_machine_header
`;
}

function c_source() {
  return `#include "gamemachine.h"

// ---------------------------------------------------------
// define wchar_t just to silence the errors found in stdlib.h
typedef unsigned char wchar_t;
// ---------------------------------------------------------
#include <stdlib.h>
#include <limits.h>

#define bool int
#define true 1
#define false 0

// ---------------------------------------------------------
// Forward declarations
// ---------------------------------------------------------
struct Node;
enum MASK_BIT;
void init_node(struct Node* node, int col, int row);
void node_set_state(struct Node* node, enum MASK_BIT mask_bit, bool active);
bool node_get_state(const struct Node* node, enum MASK_BIT mask_bit);
void node_get_neighbours(const struct Node* node, struct Node* neighbours[4]);
int calculate_distance(const struct Node* a, const struct Node* b);
void calculate_g_cost(struct Node* a);
void calculate_h_cost(struct Node* a);
void calculate_f_cost(struct Node* a);
struct Node* search();
// ---------------------------------------------------------


// ---------------------------------------------------------
// Structures
// ---------------------------------------------------------
static const int mask_obstacle   = 1;    // represents bit 0
static const int mask_traversed  = 2;    // represents bit 1
static const int mask_start      = 4;    // represents bit 2 
static const int mask_end        = 8;    // represents bit 3
static const int mask_open       = 16;   // represents bit 4
static const int mask5           = 32;   // represents bit 5
static const int mask6           = 64;   // represents bit 6
static const int mask7           = 128;  // represents bit 7

static const int masks[] = {
    mask_obstacle,
    mask_traversed,
    mask_start,
    mask_end,
    mask_open,
    mask5,
    mask6,
    mask7
};

enum MASK_BIT {
    MASK_BIT_OBSTACLE           = 0,
    MASK_BIT_TRAVERSED          = 1,
    MASK_BIT_START              = 2,
    MASK_BIT_END                = 3,
    MASK_BIT_OPEN               = 4,
};

struct Node {
    int row;
    int col;
    int state;
    int g_cost;
    int h_cost;
    int f_cost;
    struct Node* parent;
};

static struct Node* start_node;
static struct Node* end_node;
static struct Node nodes[DIMENSIONS * DIMENSIONS];

void init_node(struct Node* node, int col, int row)
{
    node->col       = col;
    node->row       = row;
    node->state     = 0;
    node->g_cost    = 0.0f;
    node->h_cost    = 0.0f;
    node->f_cost    = 0.0f;
    node->parent    = NULL;
}

void node_set_state(struct Node* node, enum MASK_BIT mask_bit, bool active)
{
    if(active >= 1) {
        node->state |= (1 << mask_bit);
    } else {
        node->state &= ~masks[mask_bit];
    }
}

bool node_get_state(const struct Node* node, enum MASK_BIT mask_bit)
{
    return (node->state & masks[mask_bit]) ? 1:0;
}

void node_get_neighbours(const struct Node* node, struct Node* neighbours[4])
{    
    if(node->row > 0) {
        neighbours[0] = &nodes[(node->row - 1) * DIMENSIONS + node->col];
    } else {
        neighbours[0] = NULL;
    }
    if(node->row < DIMENSIONS - 1) {
        neighbours[1] = &nodes[(node->row + 1) * DIMENSIONS + node->col];
    } else {
        neighbours[1] = NULL;
    }
    if(node->col > 0) {
        neighbours[2] = &nodes[node->row * DIMENSIONS + (node->col - 1)];
    } else {
        neighbours[2] = NULL;
    }
    if(node->col < DIMENSIONS - 1) {
        neighbours[3] = &nodes[node->row * DIMENSIONS + (node->col + 1)];
    } else {
        neighbours[3] = NULL;
    }
}
// ---------------------------------------------------------

// ---------------------------------------------------------
// A star
// ---------------------------------------------------------
int calculate_distance(const struct Node* a, const struct Node* b)
{
    int h = abs(a->col - b->col);
    int v = abs(a->row - b->row);
    return h + v;
}

void calculate_g_cost(struct Node* a)
{
    a->g_cost = calculate_distance(a, start_node);
}

void calculate_h_cost(struct Node* a)
{
    a->h_cost = calculate_distance(a, end_node);
}

void calculate_f_cost(struct Node* a)
{
    calculate_g_cost(a);
    calculate_h_cost(a);
    a->f_cost = a->g_cost + a->h_cost;
}

struct Node* find_lowest_f_cost_node()
{
    int lowest_f_cost = INT_MAX;
    struct Node* lowest_node = NULL;
    for(int i = 0; i < DIMENSIONS * DIMENSIONS; ++i) {
        struct Node* node = &nodes[i];
        bool is_open = node_get_state(node, MASK_BIT_OPEN);
        if(is_open == true) {
            if(lowest_node == NULL) {
                lowest_node = node;
            }
            if(node->f_cost < lowest_f_cost) {
                lowest_f_cost = node->f_cost;
                lowest_node = node;
            }
        }
    }
    return lowest_node;
}
// ---------------------------------------------------------


struct Node* search()
{
    node_set_state(start_node, MASK_BIT_OPEN, true);
    while(1) {
        struct Node* current = find_lowest_f_cost_node();
        if(current == NULL) {
            return NULL;
        }
        start_node = current;
        node_set_state(current, MASK_BIT_TRAVERSED, true);
        node_set_state(current, MASK_BIT_OPEN, false);
        if(current->col == end_node->col && current->row == end_node->row) {
            return current;
        }
        struct Node* neighbours[4] = { NULL };
        node_get_neighbours(current, neighbours);
        for(int n = 0; n < 4; ++n) {
            if(neighbours[n] == NULL) continue;
            bool is_obstacle = node_get_state(neighbours[n], MASK_BIT_OBSTACLE);
            if(is_obstacle) continue;
            bool is_traversed = node_get_state(neighbours[n], MASK_BIT_TRAVERSED);
            if(is_traversed) continue;
            calculate_f_cost(neighbours[n]);
            neighbours[n]->parent = current;
            node_set_state(neighbours[n], MASK_BIT_OPEN, true);
        }
    }
    return NULL;
}

int main()
{
    int status = OPEN_READ_GRID();
    if(status != 0) {
        return -1;
    }
    READ_GRID();
    CLOSE_READ_GRID();
    status = OPEN_WRITE_GRID();
    if(status != 0) {
        return -1;
    }
    for(int row = 0; row < DIMENSIONS; ++row) {
        for(int col = 0; col < DIMENSIONS; ++col) {
            char c = GRID[row * DIMENSIONS + col];
            struct Node* node = &nodes[row * DIMENSIONS + col];
            init_node(node, col, row);
            if(c == 'w') {
                node_set_state(node, MASK_BIT_OBSTACLE, true);
            } else if(c == 's') {
                start_node = node;
                node_set_state(node, MASK_BIT_START, true);
            } else if(c == 'e') {
                end_node = node;
                node_set_state(node, MASK_BIT_END, true);
            }
        }
    }
    struct Node* result = search();
    if(result != NULL) {
        do {
            WRITE_GRID(result->col, result->row);
            result = result->parent;
        } while(result != NULL);
    } else {
        printf("can't reach end point from starting point\\n");
    }
    CLOSE_WRITE_GRID();
    return 0;
}`;
}

function js_header(dimensions) {
  var content = "";
  for (let i = 0; i < dimensions; ++i) {
    for (let j = 0; j < dimensions; ++j) {
      let node = nodes[i * dimensions + j];
      if (node.is_obstacle) {
        content += "'w',";
      } else if (node.x === start_point.x && node.y === start_point.y) {
        content += "'s',";
      } else if (node.x === end_point.x && node.y === end_point.y) {
        content += "'e',";
      } else {
        content += "'a',";
      }
    }
  }
  return `export let DIMENSIONS = ${dimensions};
export let GRID = [${content}];
`;
}

function js_source() {
  return `import { DIMENSIONS, GRID } from "./gamemachine.js";

console.log(DIMENSIONS);
console.log(GRID);
  `;
}

function py_header(dimensions) {
  var content = "";
  for (let i = 0; i < dimensions; ++i) {
    for (let j = 0; j < dimensions; ++j) {
      let node = nodes[i * dimensions + j];
      if (node.is_obstacle) {
        content += "'w',";
      } else if (node.x === start_point.x && node.y === start_point.y) {
        content += "'s',";
      } else if (node.x === end_point.x && node.y === end_point.y) {
        content += "'e',";
      } else {
        content += "'a',";
      }
    }
  }
  return `DIMENSIONS = ${dimensions}
GRID = [${content}]
  `;
}

function py_source() {
  return `from gamemachine import DIMENSIONS, GRID

print(DIMENSIONS)
print(GRID)

start_node = None
end_node = None

data = ['a'] * DIMENSIONS;
index = 0

# read the map from the input.txt file
with open('input.txt', 'r') as file:
    data[index] = file.read()
    if data[index] == 's':
        # start point
        start_node = index
    elif data[index] == 'e':
        # end point
        end_node = index
    elif data[index] == 'w':
        # wall
        pass
    elif data[index] == 'a':
        # available free block
        pass

# implement a start here ...

# write the path to the output.txt file
with open('output.txt', 'w') as file:
    file.write("1 1\\n")
    file.write("2 2\\n")
    file.write("3 3\\n")
    file.write("4 3\\n")
    file.write("5 3\\n")`;
}
