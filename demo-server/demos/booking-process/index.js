const express = require('express');
const parser = require('ua-parser-js');
const fs = require('fs');

const templates = require('./templates.json');
const log = require('../../lib/log-to-es');

const loadSubFiles = (root) => {
  const rootEntries = Object.entries(root);

  return Object.fromEntries(rootEntries.map(([key, value]) => {
    if (typeof value === 'object') {
      return [key, loadSubFiles(value)];
    }

    if (typeof value === 'string' && value.startsWith('!!FILE:')) {
      return [key, fs.readFileSync(`${__dirname}/${value.substring(7, value.length - 2)}`, 'utf-8')]
    }

    return [key, value];
  }));
};

const loadTransforms = () => {
  const fileJson = require('./transforms.json');

  return loadSubFiles(fileJson);
};

const transforms = loadTransforms();

const router = express.Router();

const getBasicLoggingInfo = (req) => ({
  sessionId: req.get('x-session-id'),
  agent: parser(req.get('user-agent')),
  stage: req.query.stage,
});

router.get('/log-client', function (req, res) {
  log.info('Client log', getBasicLoggingInfo(req));
  res.end();
});

router.get('/log-server', function (req, res) {
  log.info('Server log', getBasicLoggingInfo(req));
  res.end();
});

const indices = ['booking-process', 'booking-journey'];

module.exports = {
  indices,
  matchesIndices: (all) => all.filter(({ index }) => indices.includes(index)),
  router,
  templates,
  transforms,
  loadProfiles: require('./profile.json'),
};
