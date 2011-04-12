goog.provide('xeme.coloring.Edge');
goog.provide('xeme.coloring.Graph');
goog.provide('xeme.coloring.Vertex');

goog.require('goog.dom');
goog.require('goog.events.EventType');
goog.require('goog.fx.Dragger');
goog.require('goog.fx.Dragger.EventType');
goog.require('xeme.draw.Canvas');
goog.require('goog.json');


/**
 * @constructor
 */
xeme.coloring.Graph = function() {
  this.vertices = [];
  this.edges = [];
  this._locked = false;
};

xeme.coloring.Graph.prototype.createVertex = function(x, y, name) {
  if (!this.vertices[name]) {
    var v = new xeme.coloring.Vertex(x, y, name, this);
    this.vertices[name] = v;
  }
  return this.vertices[name];
};

xeme.coloring.Graph.prototype.createEdge = function(v1, v2, c1, c2) {
  var e = new xeme.coloring.Edge(v1, v2, c1, c2, this);
  this.edges.push(e);
  return e;
};

xeme.coloring.Graph.prototype.toJSON = function() {
  var vertices = new Array();
  var edges = new Array();
  var v;
  var e;
  var vertex;
  var edge;
  for(var i in this.vertices) {
    v = this.vertices[i];
    vertex = {x:v.x,y:v.y,name:v.name};
    vertices.push(vertex);
  }
  for(var i in this.edges) {
    e = this.edges[i];
    edge = {v1:e.v1.name,v2:e.v2.name,c1:e.l1.color,c2:e.l2.color};
    edges.push(edge);
  }
  return goog.json.serialize({vertices:vertices,edges:edges});
};

xeme.coloring.colors = ['red', 'green', 'blue', 'brown', 'cyan'];

xeme.coloring.Graph.prototype.data = function(vertices, edges) {
  var i;
  var v;
  var v1;
  var v2;
  var e;
  var edge;

  for (i = 0; i < vertices.length; i++) {
    v = vertices[i];
    this.createVertex(v['x'], v['y'], v['name']);
  }

  for (i = 0; i < edges.length; i++) {
    e = edges[i];
    v1 = this.vertices[e['v1']];
    v2 = this.vertices[e['v2']];
    edge = this.createEdge(v1, v2, e['c1'], e['c2']);
    v1.attachEdge(edge);
    v2.attachEdge(edge);
  }

  this.redraw();
};

xeme.coloring.Graph.prototype.toDot = function() {
  var s = '';
  var k;
  var v;
  for (k in this.vertices) {
    v = this.vertices[k];
    if (v) {
      s += v.name + ' [pos="' + (600 - v.x) + ',' + (600 - v.y) + '"];\n';
    }
  }
  return s;
};

xeme.coloring.Graph.prototype.render = function(width, height, container) {
  var i;
  var k;

  if (this.canvas) {
    // just update
    var l = this.edges.length;
    while (--l >= 0) {
      var err = this.edges[l].isError();
      this.edges[l].bold(err);
    }

  } else {
    // first time
    // need to draw vertices and edges
    this.canvas = new xeme.draw.Canvas(width, height, container);

    for (i = 0; i < this.edges.length; i++) {
      var err = this.edges[i].isError();
      this.edges[i].draw(this.canvas);
      this.edges[i].bold(err);
    }

    for (k in this.vertices) {
      if (this.vertices[k])
        this.vertices[k].draw(this.canvas);
    }
  }

  if(!goog.dom.getElement('dummy-drag-target')) {
    var t = goog.dom.createElement('div');
    goog.dom.getDocument().body.appendChild(t);
    t.id = 'dummy-drag-target';
    t.style.display = 'none';
  }
};

xeme.coloring.Graph.prototype.filterColor = function(c) {
  if (c >= 0 && c < 3) {
    xeme.coloring.colors[c] = '#ccc';
  } else {
    xeme.coloring.colors = ['red', 'green', 'blue', 'brown', 'cyan'];
  }
  this.redraw();
};

xeme.coloring.Graph.prototype.redraw = function() {
  var i;
  var k;

  if (this.canvas) {
    this.canvas.clear();

    for (i = 0; i < this.edges.length; i++) {
      var err = this.edges[i].isError();
      this.edges[i].draw(this.canvas);
      this.edges[i].bold(err);
    }

    for (k in this.vertices) {
      this.vertices[k].draw(this.canvas);
    }
  }
};

xeme.coloring.Graph.prototype.swapColors = function(vertex, c1, c2) {
  var v = this.vertices[vertex];
  if (v) {
    v.swapColors(c1, c2);
  }
};

/**
 * Toggle lock the graph
 * @param {boolean} opt_locked Set the graph lock state.
 */
xeme.coloring.Graph.prototype.lock = function(opt_locked) {
  if (opt_locked) {
    this._locked = opt_locked;
  } else {
    this._locked = !this._locked;
  }
};

/**
 * Get the graph lock state
 * @return {boolean} The lock state.
 */
xeme.coloring.Graph.prototype.is_locked = function() {
  return this._locked;
};


/**
 * @constructor
 */
xeme.coloring.Vertex = function(x, y, name, graph) {
  this.name = name.toString();
  this.x = x;
  this.y = y;
  this.edges = [];
  this.links = [];
  this.graph = graph;
};

xeme.coloring.Vertex.prototype.attachEdge = function(edge) {
  this.edges.push(edge);
  this.links.push(edge.getLink(this));
};

xeme.coloring.Vertex.prototype.swapColors = function(c1, c2) {
  var i;
  for (i = 0; i < this.links.length; i++) {
    if (this.links[i].getColor() == c1) {
      this.links[i].setColor(c2);
    } else if (this.links[i].getColor() == c2) {
      this.links[i].setColor(c1);
    }
  }
};

xeme.coloring.Vertex.prototype.draw = function(canvas) {
  this.canvas = canvas;
  this.element = canvas.drawNode(this.x, this.y);
  this.label_element = canvas.drawLabel(this.x, this.y, this.name);

  goog.events.listen(this.element, goog.events.EventType.MOUSEDOWN, this.onMouseDown_, false, this);
  goog.events.listen(this.label_element, goog.events.EventType.MOUSEDOWN, this.onMouseDown_, false, this);

};

xeme.coloring.Vertex.prototype.onDrag = function(e) {
  if (this.dragger && e) {
    dragger = this.dragger;
    var trans = this.element.getTransform();
    var newX = e.clientX - dragger.prevX + trans.getTranslateX();
    var newY = e.clientY - dragger.prevY + trans.getTranslateY();
    this.element.setTransformation(newX, newY, 0, 0, 0);
    this.label_element.setTransformation(newX, newY, 0, 0, 0);
    this.x = this.x + e.clientX - dragger.prevX;
    this.y = this.y + e.clientY - dragger.prevY;
    dragger.prevX = e.clientX;
    dragger.prevY = e.clientY;
    var l = this.edges.length;
    while (--l >= 0) {
      this.edges[l].update(this);
    }
  }
};

xeme.coloring.Vertex.prototype.onDragEnd = function(e) {
  if (this.dragger) {
    this.dragger.dispose();
    this.dragger = null;
  }
};

xeme.coloring.Vertex.prototype.onMouseDown_ = function(e) {
  if (this.graph.is_locked()) {
    return;
  }
  dragger = new goog.fx.Dragger(goog.dom.$('dummy-drag-target'));
  this.dragger = dragger;
  dragger.prevX = e.clientX;
  dragger.prevY = e.clientY;
  goog.events.listen(dragger, goog.fx.Dragger.EventType.DRAG, this.onDrag, false, this);
  goog.events.listen(dragger, goog.fx.Dragger.EventType.END, this.onDragEnd, false, this);
  dragger.startDrag(e);
};


/**
 * @constructor
 */
xeme.coloring.Link = function(sx, sy, ex, ey, color) {
  this.sx = sx;
  this.sy = sy;
  this.ex = ex;
  this.ey = ey;
  this.color = color;
  this.width = 1.2;
  this.bold = false;
};

/**
 * Draw the link on canvas
 * @param {xeme.draw.Canvas} canvas The canvas to draw on.
 */
xeme.coloring.Link.prototype.draw = function(canvas) {
  this.canvas = canvas;
  this.element = canvas.drawLine(this.sx, this.sy, this.ex, this.ey, xeme.coloring.colors[this.color], this.width);
};

xeme.coloring.Link.prototype.update = function(sx, sy, ex, ey) {
  this.sx = sx;
  this.sy = sy;
  this.ex = ex;
  this.ey = ey;
  this.canvas.updateLine(this.element, xeme.coloring.colors[this.color], this.width, sx, sy, ex, ey);
};

xeme.coloring.Link.prototype.getColor = function() {
  return this.color;
};

xeme.coloring.Link.prototype.setColor = function(color) {
  if (this.canvas && this.color != color) {
    this.canvas.updateLine(this.element, xeme.coloring.colors[color], this.width);
    this.color = color;
  }
};

xeme.coloring.Link.prototype.bold_ = function(b) {
  if (this.canvas && this.bold != b) {
    if (b) {
      this.width = 2.4;
    } else {
      this.width = 1.2;
    }
    this.canvas.updateLine(this.element, xeme.coloring.colors[this.color], this.width);
    this.bold = b;
  }
};

/**
 * @constructor
 */
xeme.coloring.Edge = function(v1, v2, c1, c2, graph) {
  this.v1 = v1;
  this.v2 = v2;
  var x1 = v1.x;
  var y1 = v1.y;
  var x2 = v2.x;
  var y2 = v2.y;
  var mx = (x1 + x2) / 2.0;
  var my = (y1 + y2) / 2.0;
  this.l1 = new xeme.coloring.Link(x1, y1, mx, my, c1);
  this.l2 = new xeme.coloring.Link(x2, y2, mx, my, c2);
  this.graph = graph;
};

xeme.coloring.Edge.prototype.update = function(v) {
  if (v != this.v1 && v != this.v2) {
    return;
  }
  var x1 = this.v1.x;
  var y1 = this.v1.y;
  var x2 = this.v2.x;
  var y2 = this.v2.y;
  var mx = (x1 + x2) / 2.0;
  var my = (y1 + y2) / 2.0;
  this.l1.update(x1, y1, mx, my);
  this.l2.update(x2, y2, mx, my);
};

xeme.coloring.Edge.prototype.draw = function(canvas) {
  this.canvas = canvas;
  this.l1.draw(canvas);
  this.l2.draw(canvas);
};


xeme.coloring.Edge.prototype.isError = function() {
  if (this.l1.getColor() == this.l2.getColor()) {
    return false;
  }
  return true;
};

xeme.coloring.Edge.prototype.bold = function(b) {
  this.l1.bold_(b);
  this.l2.bold_(b);
};

xeme.coloring.Edge.prototype.getLink = function(vertex) {
  if (this.v1 == vertex) {
    return this.l1;
  }
  if (this.v2 == vertex) {
    return this.l2;
  }
  return undefined;
};

goog.exportSymbol('xeme.coloring.Graph', xeme.coloring.Graph);
goog.exportSymbol('xeme.coloring.Graph.prototype.createVertex', xeme.coloring.Graph.prototype.createVertex);
goog.exportSymbol('xeme.coloring.Graph.prototype.createEdge', xeme.coloring.Graph.prototype.createEdge);
goog.exportSymbol('xeme.coloring.Graph.prototype.data', xeme.coloring.Graph.prototype.data);
goog.exportSymbol('xeme.coloring.Graph.prototype.render', xeme.coloring.Graph.prototype.render);
goog.exportSymbol('xeme.coloring.Graph.prototype.toDot', xeme.coloring.Graph.prototype.toDot);
goog.exportSymbol('xeme.coloring.Graph.prototype.swapColors', xeme.coloring.Graph.prototype.swapColors);
goog.exportSymbol('xeme.coloring.Graph.prototype.filterColor', xeme.coloring.Graph.prototype.filterColor);
goog.exportSymbol('xeme.coloring.Graph.prototype.lock', xeme.coloring.Graph.prototype.lock);
goog.exportSymbol('xeme.coloring.Graph.prototype.is_locked', xeme.coloring.Graph.prototype.is_locked);
goog.exportSymbol('xeme.coloring.Graph.prototype.toJSON', xeme.coloring.Graph.prototype.toJSON);
