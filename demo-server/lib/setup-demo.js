
const updateTransform = async (elasticsearchClient, { id, body }) => {
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

const standardSetup = async (elasticsearchClient, name, { templates, transforms }) => {
  return Promise.all([
    ...Object.entries(templates).map(([templateName, body]) => elasticsearchClient.indices.putTemplate({
      name: `${name}__${templateName}`,
      body,
    })),
    ...Object.entries(transforms).map(([transformName, body]) => updateTransform(elasticsearchClient, {
      id: `${name}__${transformName}`,
      body,
    })),
  ]);
};

const setupDemo = async (elasticsearchClient, demo) => {
  try {
    const { name, templates, transforms } = demo;
      await standardSetup(elasticsearchClient, name, { templates, transforms });
  } catch (e) {
    console.log(`Error Setting Up ${demo}: ${e.message}`);
    console.log(e.meta.body.error);
  }
};

module.exports = { setupDemo };