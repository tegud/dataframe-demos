const parser = require('ua-parser-js');

const log = require('../../lib/log-to-es').buildLogger('rate-logging');
const { createDemo } = require('../../lib/demo-core');

const getBasicLoggingInfo = (req) => ({
  searchId: req.get('x-search-id'),
  provider: req.query.provider,
  hotelId: req.query.hotelId,
  rate: req.query.rate,
});

module.exports = createDemo({
  demoFolder: __dirname,
  indices: ['rate-logging', 'rate-accuracy'],
  router: (router) => {
    router.get('/search', function (req, res) {
      log.info('Search Result Clicked', getBasicLoggingInfo(req));
      res.end();
    });
    
    router.get('/hotel-details', function (req, res) {
      log.info('Hotel Details Loaded', getBasicLoggingInfo(req));
      res.end();
    });

    return router;
  },
  templates: require('./templates.json'),
  transforms: require('./transforms.json'),
  loadProfiles: require('./profile.json'),
});
