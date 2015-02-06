#!/usr/bin/env node
/**
 * Dashboard CLI
 * by Mike Green <mike.is.green@gmail.com>
 */

'use strict';

var _       = require('lodash');
var blessed = require('blessed');
var contrib = require('blessed-contrib');
var ts      = require('tail-stream');
var exec    = require('child_process').exec;

var screen = blessed.screen();

var mainGrid = new contrib.grid({ rows: 1, cols: 2 });

mainGrid.set(0, 0, contrib.log, {
  fg: 'green',
  selectedFg: 'cyan',
  label: 'Server Log'
});

mainGrid.set(0, 1, contrib.sparkline, {
  label: 'Load Average',
  tags: true,
  style: { fg: 'blue' }
});

mainGrid.applyLayout(screen);

var log  = mainGrid.get(0, 0);
var load = mainGrid.get(0, 1);

var loadHistory = [];
var updateLoadGraph = function() {
  if (loadHistory.length > 50) {
    loadHistory.shift();
  }

  exec('uptime', function(err, stdout, stderr) {
    if (err) {
      return;
    }

    var tokens = stdout.split(/\s+/);
    loadHistory.push(tokens[10]);
    load.setData(['localhost'], [loadHistory]);
  });
  screen.render();
};

updateLoadGraph();
setInterval(updateLoadGraph, 1000);

var tail = ts.createReadStream('/var/log/syslog', {
  endOnError: true
});

tail.on('data', function(data) {
  log.log(data.toString());
});

// Exit bindings
screen.key(['q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

screen.render();
