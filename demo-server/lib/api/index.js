const express = require('express');
const axios = require('axios');

const { wait } = require('../utilities');
const { setupDemo } = require('../setup-demo');

const getLoadData = async () => {
  try {
    const { data } = await axios('http://localhost:3031');

    return data;
  } catch (e) {
    console.log(`Could not contact load generator: ${e.message}`);
  }
};

const getExistingTransforms = async (elasticsearchClient, matchingDemo) => {
  const {
    transforms = []
  } = matchingDemo;

  const allTransforms = await elasticsearchClient.transform.getTransform({
    transform_id: '_all',
    size: 100,
    allow_no_match: true
  });

  const existingTransforms = allTransforms.body.transforms.map(({ id }) => id);

  return Object.keys(transforms)
    .map((id) => `${matchingDemo.name}__${id}`)
    .filter((id) => existingTransforms.includes(id));
}

module.exports = (elasticsearchClient, demoModules) => {
  const router = express.Router();
  
  const transformToggle = async (enable, req, res) => {
    try {
      await elasticsearchClient.transform[enable ? 'startTransform' : 'stopTransform']({ transformId: req.query.transform });
    } catch (e) {
      console.log(e.meta.body.error);
      return res.status(500).json({ error: e.message });
    }

    res.json({});
  };

  const stopTransforms = async (transformIds) => {
    await Promise.all(transformIds.map((transformId) => elasticsearchClient.transform.stopTransform({ transformId })));
  };

  const removeTransforms = async (transformIds) => {
    await Promise.all(transformIds.map((transformId) => elasticsearchClient.transform.deleteTransform({ transformId })));
  };

  const clearData = async (demo) => {
    const [matchingDemo] = demoModules.filter(({ name }) => name === demo);

    try {
      await elasticsearchClient.indices.delete({
        index: matchingDemo.indices.join(','),
        allow_no_indices: true,
      });
    } catch (e) {
    }
  };

  const startLoadProfile = async (demo, name) => {
    const [matchingDemo] = demoModules.filter(({ name }) => name === demo);

    const [loadProfile] = matchingDemo.loadProfiles.filter((profile) => profile.name === name);

    await axios({ url: 'http://localhost:3031/start', data: loadProfile, method: 'POST' });
  };
  
  const stopLoadProfile = async (id) => {
    await axios({ url: `http://localhost:3031/stop?id=${id}`, method: 'POST' });
  };
  
  router
    .get('/elasticsearch-health', async (req, res) => {
      try {
        const { body } = await elasticsearchClient.cluster.health();
        res.json({ status: body });
      } catch(e) {
        console.log(`Error contacting elasticsearch: ${e.message}`);
        res.status(503).json({ status: { status: 'unreachable' } });
      }
    })
    .get('/demos', async (req, res) => {
      const [
        allIndices,
        allTransforms,
        transformStats,
        loadData,
      ] = await Promise.all([
        elasticsearchClient.cat.indices({ format: 'json' }),
        elasticsearchClient.transform.getTransform({
          transform_id: '_all',
          size: 100,
          allow_no_match: true
        }),
        elasticsearchClient.transform.getTransformStats({
          transform_id: '_all',
          size: 100,
          allow_no_match: true
        }),
        getLoadData(),
      ]);

      res.json({
        loadServerAlive: loadData ? true : false,
        demos: demoModules.map(({ name, loadProfiles, matchesIndices, ...rest }) => {
          const indices = matchesIndices
            ? matchesIndices(allIndices.body)
            : [];

          const transforms = allTransforms.body.transforms
            .filter(({ dest, source }) => [
                ...source.index,
                dest.index,
              ].some(index => rest.indices.includes(index)))
            .map(({ id, ...transform }) => {
              const [stats] = transformStats.body.transforms.filter((stats) => id === stats.id);

              return {
                id,
                ...transform,
                ...stats,
              }
            });

          return { name, indices, transforms, loadProfiles: loadProfiles.map(({ name }) => {
            return {
              name,
              running: Object.entries(loadData.running)
                .filter(([, value]) => name === value.name)
                .map(([id, value]) => ({
                  id,
                  ...value,
                })),
            };
          }) };
        }),
      });
    })
    .post('/stop-transform', transformToggle.bind(undefined, false))
    .post('/start-transform', transformToggle.bind(undefined, true))
    .post('/recreate-transform', async (req, res) => {
      const { demo, transform } = req.query;
      const [matchedDemo] = demoModules.filter(({ name }) => demo === name);

      await elasticsearchClient.transform.deleteTransform({
        transformId: transform,
      });

      await elasticsearchClient.transform.putTransform({
        transformId: transform,
        deferValidation: true,
        body: matchedDemo.transforms[transform.replace(`${demo}__`, '')],
      });

      res.json({});
    })
    .post('/delete-all-data', async (req, res) => {
      await clearData(req.query.demo);
      res.json({});
    })
    .post('/tear-down-demo', async (req, res) => {
      const { demo } = req.query;
      const loadData = await getLoadData();

      await Promise.all(Object.entries(loadData.running)
        .filter(([, { name }]) => name === demo)
        .map(([id]) => id).map(id => stopLoadProfile(id)));
 
      const [matchingDemo] = demoModules.filter(({ name }) => name === demo);

      if (!matchingDemo) {
        return;
      }

      const transformIds = await getExistingTransforms(elasticsearchClient, matchingDemo);
 
      await stopTransforms(transformIds);
      await wait(1000);
      await removeTransforms(transformIds);
      await clearData(demo);

      res.json({});
    })
    .post('/setup-demo', async (req, res) => {
      const { demo } = req.query;
      
      const [matchingDemo] = demoModules.filter(({ name }) => name === demo);
      
      setupDemo(elasticsearchClient, matchingDemo);

      res.json({});
    })
    .post('/delete-index', async (req, res) => {
      await elasticsearchClient.indices.delete({
        index: req.query.index,
        allow_no_indices: true,
      });
      res.json({});
    })
    .post('/reset-templates', async (req, res) => res.json({}))
    .post('/start-load-profile', async (req, res) => {
      const { demo, name } = req.query;

      startLoadProfile(demo, name);

      res.json({});
    })
    .post('/stop-load-profile', async (req, res) => {
      const { id } = req.query;

      stopLoadProfile(id);

      res.json({});
    });
  return router;
};
