#!/usr/bin/env node
/**
 * Dashboard CLI
 * by Mike Green <mike.is.green@gmail.com>
 */

'use strict';

var _       = require('lodash');
var os      = require('os-utils');
var blessed = require('blessed');
var contrib = require('blessed-contrib');
var ts      = require('tail-stream');
var exec    = require('child_process').exec;

var screen = blessed.screen();

var mainGrid = new contrib.grid({ rows: 1, cols: 2 });
var subGrid1 = new contrib.grid({ rows: 2, cols: 1 });
var subGrid2 = new contrib.grid({ rows: 2, cols: 1 });

mainGrid.set(0, 0, subGrid1);
mainGrid.set(0, 1, subGrid2);

subGrid1.set(0, 0, contrib.log, {
  fg: 'white',
  selectedFg: 'cyan',
  label: 'Server Log'
});

subGrid1.set(1, 0, contrib.gauge, {
  label: 'CPU Usage %'
});

subGrid2.set(0, 0, contrib.sparkline, {
  label: 'Load Average',
  tags: true,
  style: { fg: 'blue' }
});

subGrid2.set(1, 0, contrib.gauge, {
  label: 'Memory Usage %'
});

mainGrid.applyLayout(screen);

var log  = subGrid1.get(0, 0);
var load = subGrid2.get(0, 0);
var cpu  = subGrid1.get(1, 0);
var mem  = subGrid2.get(1, 0);

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

var updateCPU = function() {
  os.cpuUsage(function(num) {
    var percent = Math.round(num * 100);
    cpu.setPercent(percent);
  });
};

updateCPU();
setInterval(updateCPU, 1000);

var updateMemory = function() {
  var total = os.totalmem();
  var free  = os.freemem();
  var percentFree = (free / total) * 100;
  var percentUsed = Math.round(100 - percentFree);
  mem.setPercent(percentUsed);
};

updateMemory();
setInterval(updateMemory, 1000);

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
