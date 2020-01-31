const express = require('express');
const { Client } = require('@elastic/elasticsearch');
const cors = require('cors');
 
const log = require('./lib/log-to-es');
const apiRouter = require('./lib/api');
const { setupDemo } = require('./lib/setup-demo');

const app = express();
const port = 3030;

app.use(cors());

const demoModules = [
  'booking-process',
  'ci-simulator',
  'rate-accuracy',
].map(name => ({
  name,
  ...require(`./demos/${name}`),
}));

const elasticsearchClient = new Client({ node: 'http://localhost:9200' });

log.configure(elasticsearchClient);

(async () => {
  await Promise.all(demoModules.map((demo) => setupDemo(elasticsearchClient, demo)));

  demoModules.forEach(({ name, router }) => {
    if (!router) {
      console.log(`${name} has no routes`);
      return;
    }

    console.log(`${name} attached to route: /${name}`);
    app.use(`/${name}`, router);
  });

app
  .use('/api', apiRouter(elasticsearchClient, demoModules))
  .listen(port, (err) => {
    if (err) {
      console.log(`Error starting: ${err.message}`);
    }

    console.log(`Listening on port ${port}`);
  });
})();
