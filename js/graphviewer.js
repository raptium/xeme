goog.provide('xeme.ui.GraphViewer');
goog.provide('xeme.ui.GraphViewerConsole');
goog.provide('xeme.ui.GraphViewerToolbar');

goog.require('goog.Timer');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('goog.math.Box');
goog.require('goog.net.XhrIo');
goog.require('goog.positioning.AnchoredViewportPosition');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.Container');
goog.require('goog.ui.Menu');
goog.require('goog.ui.MenuItem');
goog.require('goog.ui.MenuSeparator');
goog.require('goog.ui.Option');
goog.require('goog.ui.ProgressBar');
goog.require('goog.ui.Toolbar');
goog.require('goog.ui.ToolbarButton');
goog.require('goog.ui.ToolbarMenuButton');
goog.require('goog.ui.ToolbarSelect');
goog.require('goog.ui.ToolbarSeparator');
goog.require('goog.ui.ToolbarToggleButton');
goog.require('xeme.coloring.Graph');

/**
 * @constructor
 * @param {xeme.coloring.Graph=} graph The graph object to be controlled.
 */
xeme.ui.GraphViewerToolbar = function(graph, viewer) {
  this.graph = graph;
  this.viewer = viewer;
  this.toolbar = new goog.ui.Toolbar();
  // create buttons

  var m_reset = new goog.ui.ToolbarButton('Reset');
  m_reset.addClassName('control_reset');
  var m_filter = new goog.ui.ToolbarSelect('Filter');
  m_filter.addClassName('control_filter');
  m_filter.addItem(new goog.ui.Option('None'));
  m_filter.addItem(new goog.ui.MenuSeparator());
  m_filter.addItem(new goog.ui.Option('Red'));
  m_filter.addItem(new goog.ui.Option('Green'));
  m_filter.addItem(new goog.ui.Option('Blue'));

  var m_lock = new goog.ui.ToolbarToggleButton('Locked');
  m_lock.addClassName('control_lock');

  this.toolbar.addChild(m_reset, true);
  this.toolbar.addChild(m_lock, true);
  this.toolbar.addChild(m_filter, true);

  // debug buttons
  var m_debug = new goog.ui.ToolbarButton('Debug');
  m_debug.addClassName('control_debug');
  this.toolbar.addChild(m_debug, true);

  // create control buttons
  var m_start = new goog.ui.ToolbarButton('Start');
  m_start.addClassName('control_start');
  m_start.setEnabled(false);
  var m_stop = new goog.ui.ToolbarButton('Stop');
  m_stop.addClassName('control_stop');
  m_stop.setEnabled(false);
  this.toolbar.addChild(m_start, true);
  this.toolbar.addChild(m_stop, true);

  // control buttons
  goog.events.listen(m_filter,
    goog.ui.Component.EventType.ACTION,
    this.handleFilterAction_, false, this);

  goog.events.listen(m_lock,
    goog.ui.Component.EventType.ACTION,
    this.handleLockAction_, false, this);

  goog.events.listen(m_start,
    goog.ui.Component.EventType.ACTION,
    this.viewer.play, false, this.viewer);

  goog.events.listen(m_stop,
    goog.ui.Component.EventType.ACTION,
    this.viewer.stop, false, this.viewer);

  goog.events.listen(m_debug,
    goog.ui.Component.EventType.ACTION,
    this.viewer.debug, false, this.viewer);

  this.filterSelect = m_filter;
  this.lockButton = m_lock;
  this.startButton = m_start;
  this.stopButton = m_stop;
  this.currentFiltered = -1;

  goog.events.listen(viewer, 'state_changed',
    this.handleStateChange_, false, this);

  this.progressBar = new goog.ui.ProgressBar();
  goog.events.listen(viewer, 'operate',
    this.handleOperate_, false, this);
};

/**
 * Callback function to handle operate events
 * @private
 */
xeme.ui.GraphViewerToolbar.prototype.handleOperate_ = function(e) {
  var p = this.viewer.getProgress();
  this.progressBar.setValue(p);
};


/**
 * Callback function to handle StateChange events
 * @private
 */
xeme.ui.GraphViewerToolbar.prototype.handleStateChange_ = function(e) {
  switch (this.viewer.getState()) {
    case xeme.ui.GraphViewer.State.STOPPED:
      this.startButton.setEnabled(true);
      this.stopButton.setEnabled(false);
      break;
    case xeme.ui.GraphViewer.State.PLAYING:
      this.startButton.setEnabled(false);
      this.stopButton.setEnabled(true);
      break;
    default:
      this.startButton.setEnabled(false);
      this.stopButton.setEnabled(false);
  }
};

/**
 * Handle lock button action
 * @private
 */
xeme.ui.GraphViewerToolbar.prototype.handleLockAction_ = function(e) {
  var locked = this.lockButton.isChecked();
  this.graph.lock(locked);
};

/**
 * Handle filter menu action
 * @private
 */
xeme.ui.GraphViewerToolbar.prototype.handleFilterAction_ = function(e) {
  var idx = this.filterSelect.getSelectedIndex();
  this.graph.filterColor(-1);
  this.graph.filterColor(idx - 2);
  this.currentFiltered = idx - 2;
};


/**
 * @param {Element=} opt_parentElement Optional parent element to render
 * the toolbar into.
 */
xeme.ui.GraphViewerToolbar.prototype.render = function(opt_parentElement) {
  this.toolbar.render(opt_parentElement);
  this.progressBar.renderBefore(this.toolbar.getElement());
};


/**
 * Viewer to display the graph and operation.
 *
 * @param {string} graphUrl The URL of graph data.
 * @param {string} opt_parentElement Optional parent element to render
 * the toolbar into.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
xeme.ui.GraphViewer = function(graphUrl, opt_parentElement) {
  this.viewer = new goog.ui.Container();
  this.graph = new xeme.coloring.Graph();
  this.toolbar = new xeme.ui.GraphViewerToolbar(this.graph, this);
  var request = new goog.net.XhrIo();
  goog.events.listen(request, 'complete', function() {
    if (request.isSuccess()) {
      this.update_(request.getResponseJson());
    } else {
      console.log(request);
    }
  }, false, this);
  this.graphUrl = graphUrl;
  request.send(this.graphUrl);
  this.render(opt_parentElement);

  this.state = xeme.ui.GraphViewer.State.NOT_READY; // control state
};
goog.inherits(xeme.ui.GraphViewer, goog.events.EventTarget);

/**
 * Add operations to the graph
 * @param {string} operationUrl the URL of operations JSON.
 */
xeme.ui.GraphViewer.prototype.addOperations = function(operationsUrl) {
  if (this.state != xeme.ui.GraphViewer.State.NOT_READY) {
    return;
  }
  var request = new goog.net.XhrIo();
  goog.events.listen(request, 'complete', function() {
    if (request.isSuccess()) {
      this.operationsHandler_(request.getResponseJson());
    } else {
      console.log(request);
    }
  }, false, this);
  request.send(operationsUrl);
};

/**
 * operate
 * @private
 */
xeme.ui.GraphViewer.prototype.operate_ = function() {
  if (this.state == xeme.ui.GraphViewer.State.PLAYING) {
    var opt = this.opts[this.step];
    var v = opt[0];
    var c1 = opt[1];
    var c2 = opt[2];
    this.step++;
    this.graph.swapColors(v, c1, c2);
    this.dispatchEvent('operate');
    this.graph.redraw();
    if (this.step < this.opts.length) {
      goog.Timer.callOnce(this.operate_, 200, this);
    } else {
      this.state = xeme.ui.GraphViewer.State.FINISHED;
      this.dispatchEvent('state_changed');
    }
  }
};

/**
 * GraphViewer play states.
 * @enum {string}
 */
xeme.ui.GraphViewer.State = {
  NOT_READY: 'not_ready',
  STOPPED: 'stopped',
  PLAYING: 'playing',
  FINISHED: 'finished'
};

/**
 * Get the current state of GraphViewer
 * @return {xeme.ui.GraphViewer.State}
 */
xeme.ui.GraphViewer.prototype.getState = function() {
  return this.state;
};

/**
 * Get current progress of the GraphViewer
 * @return {number} current progress in percentage.
 */
xeme.ui.GraphViewer.prototype.getProgress = function() {
  return this.step * 100 / this.opts.length;
};

/**
 * Start the operations.
 */
xeme.ui.GraphViewer.prototype.play = function() {
  if (this.state == xeme.ui.GraphViewer.State.STOPPED) {
    this.state = xeme.ui.GraphViewer.State.PLAYING;
    this.dispatchEvent('state_changed');
    this.operate_();
  }
};

/**
 * Stop the operations.
 */
xeme.ui.GraphViewer.prototype.stop = function() {
  if (this.state == xeme.ui.GraphViewer.State.PLAYING) {
    this.state = xeme.ui.GraphViewer.State.STOPPED;
    this.dispatchEvent('state_changed');
  }
};

/**
 * For debugging
 */
xeme.ui.GraphViewer.prototype.debug = function() {
  console.log(this.graph.toJSON());
};

/**
 * Hanlde the operations JSON object
 * @private
 * @param {Object=} opts The JSON object fetched through XHR.
 */
xeme.ui.GraphViewer.prototype.operationsHandler_ = function(opts) {
  this.opts = opts;
  this.step = 0;
  this.state = xeme.ui.GraphViewer.State.STOPPED;
  this.dispatchEvent('state_changed');
};

/**
 * Update graph data with JSON fetched
 * @private
 * @param {Object=} data The JSON object fetched through XHR.
 */
xeme.ui.GraphViewer.prototype.update_ = function(data) {
  this.graph.data(data['vertices'], data['edges']);
};

/**
 * Render the GraphViwer to current postion or in the parent element.
 * @param {string} opt_parentElement Optional parent element to render
 * the toolbar into.
 */
xeme.ui.GraphViewer.prototype.render = function(opt_parentElement) {
  var parent;
  if (opt_parentElement) {
    parent = goog.dom.getElement(opt_parentElement);
  } else {
    parent = goog.dom.createElement('div');
    goog.dom.getDocument().body.appendChild(parent);
  }
  parent.className = 'xeme_graph_wrapper';
  this.graph.render(600, 600, parent);
  this.toolbar.render(parent);
};


goog.exportSymbol('xeme.ui.GraphViewer', xeme.ui.GraphViewer);
goog.exportSymbol('xeme.ui.GraphViewer.prototype.addOperations', xeme.ui.GraphViewer.prototype.addOperations);
goog.exportSymbol('xeme.ui.GraphViewer.prototype.render', xeme.ui.GraphViewer.prototype.render);
goog.exportSymbol('xeme.ui.GraphViewer.prototype.play', xeme.ui.GraphViewer.prototype.play);
goog.exportSymbol('xeme.ui.GraphViewer.prototype.stop', xeme.ui.GraphViewer.prototype.stop);
goog.exportSymbol('xeme.ui.GraphViewer.prototype.getState', xeme.ui.GraphViewer.prototype.getState);
goog.exportSymbol('xeme.ui.GraphViewer.prototype.getProgress', xeme.ui.GraphViewer.prototype.getProgress);
goog.exportSymbol('xeme.ui.GraphViewer.prototype.debug', xeme.ui.GraphViewer.prototype.debug);
goog.exportSymbol('xeme.ui.GraphViewerToolbar', xeme.ui.GraphViewerToolbar);
goog.exportSymbol('xeme.ui.GraphViewerToolbar.prototype.render', xeme.ui.GraphViewerToolbar.prototype.render);
