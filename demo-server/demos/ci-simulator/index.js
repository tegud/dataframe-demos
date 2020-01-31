const { createDemo } = require('../../lib/demo-core');
const gitLog = require('../../lib/log-to-es').buildLogger('ci-git-events');
const ciLog = require('../../lib/log-to-es').buildLogger('ci-events');

const getBuildRevision = (req) => ({
  buildRevision: req.get('x-build-revision'),
});

module.exports = createDemo({
  demoFolder: __dirname,
  indices: ['ci-git-events', 'ci-events', 'build-performance'],
  router: (router) => {
    console.log('attaching ci routes');
    router.get('/git-webhook', function (req, res) {
      gitLog.info('Git Commit', {
        ...getBuildRevision(req),
      });

      res.end();
    });
    
    router.get('/ci-webhook', function (req, res) {
      const { pipeline, stage, event } = req.query;

      ciLog.info('CI Event', {
        ...getBuildRevision(req),
        pipeline,
        stage,
        event,
      });

      res.end();
    });

    return router;
  },
  templates: require('./templates.json'),
  transforms: require('./transforms.json'),
  loadProfiles: require('./profile.json'),
});
