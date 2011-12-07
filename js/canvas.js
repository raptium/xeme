goog.provide('xeme.draw.Canvas');
goog.require('goog.dom');
goog.require('goog.graphics');

/**
 * Create the canvas to draw the graph.
 * @param {number} width The width of the canvas.
 * @param {number} height The height of the canvas.
 * @param {string} parent The parent element which the canvas is rendered to.
 * @constructor
 */
xeme.draw.Canvas = function(width, height, parent) {
  this.width = width;
  this.height = height;
  this.parent = goog.dom.getElement(parent);
  this.graphics = goog.graphics.createGraphics(width, height);
  this.graphics.render(this.parent);
};

xeme.draw.Canvas.prototype.clear = function() {
  this.graphics.clear();
};

xeme.draw.Canvas.prototype.drawNode = function(cx, cy) {
  var stroke = new goog.graphics.Stroke(0.75, '#333');
  var fill = new goog.graphics.SolidFill('white');
  var e = this.graphics.drawEllipse(cx, cy, 5, 5, stroke, fill);
  return e;
};

xeme.draw.Canvas.prototype.drawLabel = function(cx, cy, text) {
  var font = new goog.graphics.Font(10, 'arial, helvetica, verdana,sans-serif');
  var w = 6;
  var stroke = new goog.graphics.Stroke(.5, 'black');
  var fill = new goog.graphics.SolidFill('black');
  var e = this.graphics.drawTextOnLine(text, cx - w, cy + 12, cx + w, cy + 12, 'center', font, stroke, fill);
  return e;
};

xeme.draw.Canvas.prototype.drawLine = function(sx, sy, ex, ey, color, width) {
  var stroke = new goog.graphics.Stroke(width, color);
  var fill = new goog.graphics.SolidFill(color);
  var path = new goog.graphics.Path();
  path.moveTo(sx, sy);
  path.lineTo(ex, ey);
  var e = this.graphics.drawPath(path, stroke, fill);
  return e;
};

xeme.draw.Canvas.prototype.updateLine = function(element, color, width, sx, sy, ex, ey) {
  var stroke = new goog.graphics.Stroke(width, color);
  var fill = new goog.graphics.SolidFill(color);
  this.graphics.setElementStroke(element, stroke);
  this.graphics.setElementFill(element, fill);
  if (sx) {
    var path = new goog.graphics.Path();
    path.moveTo(sx, sy);
    path.lineTo(ex, ey);
    element.setPath(path);
  }
};

goog.exportSymbol('xeme.draw.Canvas', xeme.draw.Canvas);
goog.exportSymbol('xeme.draw.Canvas.prototype.drawNode', xeme.draw.Canvas.prototype.drawNode);
goog.exportSymbol('xeme.draw.Canvas.prototype.drawLabel', xeme.draw.Canvas.prototype.drawLabel);
goog.exportSymbol('xeme.draw.Canvas.prototype.drawLine', xeme.draw.Canvas.prototype.drawLine);
goog.exportSymbol('xeme.draw.Canvas.prototype.updateLine', xeme.draw.Canvas.prototype.updateLine);
goog.exportSymbol('xeme.draw.Canvas.prototype.clear', xeme.draw.Canvas.prototype.clear);
