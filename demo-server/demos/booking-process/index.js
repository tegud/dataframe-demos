const parser = require('ua-parser-js');

const log = require('../../lib/log-to-es').buildLogger('booking-process');
const { createDemo } = require('../../lib/demo-core');

const getBasicLoggingInfo = (req) => ({
  sessionId: req.get('x-session-id'),
  agent: parser(req.get('user-agent')),
  stage: req.query.stage,
});

module.exports = createDemo({
  demoFolder: __dirname,
  indices: ['booking-process', 'booking-journey', 'booking-journey-delayed'],
  router: (router) => {
    router.get('/log-client', function (req, res) {
      log.info('Client log', getBasicLoggingInfo(req));
      res.end();
    });
    
    router.get('/log-server', function (req, res) {
      log.info('Server log', getBasicLoggingInfo(req));
      res.end();
    });

    return router;
  },
  templates: require('./templates.json'),
  transforms: require('./transforms.json'),
  loadProfiles: require('./profile.json'),
});
