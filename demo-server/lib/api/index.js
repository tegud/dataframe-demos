const express = require('express');
const axios = require('axios');

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

  const clearData = async (demo) => {
    const [matchingDemo] = demoModules.filter(({ name }) => name === demo);

    await elasticsearchClient.indices.delete({
      index: matchingDemo.indices.join(','),
      allow_no_indices: true,
    });
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
        { data },
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
        axios('http://localhost:3031'),
      ]);

      console.log(data);

      res.json({
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

          return { name, indices, transforms, loadProfiles: loadProfiles.map(({ name }) => name) };
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
    .post('/delete-index', async (req, res) => {
      await elasticsearchClient.indices.delete({
        index: req.query.index,
        allow_no_indices: true,
      });
      res.json({});
    })
    .post('/reset-templates', async (req, res) => res.json({}));
  return router;
};
