const express = require('express');
const { Client } = require('@elastic/elasticsearch');
const cors = require('cors');
 
const log = require('./lib/log-to-es');
const apiRouter = require('./lib/api');

const app = express();
const port = 3030;

app.use(cors());

const demoModules = [
  'booking-process',
].map(name => ({
  name,
  ...require(`./demos/${name}`),
}));

const elasticsearchClient = new Client({ node: 'http://localhost:9200' });

log.configure(elasticsearchClient);

const updateTransform = async ({ id, body }) => {
  let existing = false;
  try {
    const result = await elasticsearchClient.transform.getTransform({
      transformId: id,
    });

    existing = result.body.count ? true : false;
  } catch (e) {
    if (e.message === 'resource_not_found_exception') {
      existing = false;
    } else {
      console.log(e);
      throw e;
    }
  }

  const { pivot, ...rest } = body;

  const transformBody = existing ? rest : body;

  return elasticsearchClient.transform[existing ? 'updateTransform' : 'putTransform']({
    transformId: id,
    deferValidation: true,
    body: transformBody,
  });
};

const standardSetup = async (name, { templates, transforms }) => {
  return Promise.all([
    ...Object.entries(templates).map(([templateName, body]) => elasticsearchClient.indices.putTemplate({
      name: `${name}__${templateName}`,
      body,
    })),
    ...Object.entries(transforms).map(([transformName, body]) => updateTransform({
      id: `${name}__${transformName}`,
      body,
    })),
  ]);
};

(async () => {
  try {
    await Promise.all(demoModules.filter(({ setup }) => setup).map(({ name, setup, templates, transforms }) => {
      if (typeof setup === 'function') {
        return setup();
      } else {
        return standardSetup(name, { templates, transforms });
      }
    }));
  } catch (e) {
    console.log(`Error Setting Up: ${e.message}`);
  }

  demoModules.forEach(({ name, router }) => {
    if (!router) {
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
