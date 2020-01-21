const { json } = require('body-parser');
const express = require('express');

const createProfileRunner = require('./profile-runner');

const app = express();

const createProfileRunManager = () => {
  const running = {};

  return {
    start: (name, profiles) => {
      console.log(`Creating new runner for ${name}`);
      const { id, ...newRunner } = createProfileRunner(profiles);
      running[id] = newRunner;
      newRunner.start();
      newRunner.on('complete', () => {
        console.log(`Run Complete: ${name} (${id})`);
        delete running[id];
      });
    },
    getRunning: () => {
      const runningEntries = Object.entries(running);

      return Object.fromEntries(runningEntries.map(([key, value]) => [
        key,
        {
          ...value.getStatus(),
          ...value.getStats(),
        },
      ]))
    },
  };
};

const profileRunner = createProfileRunManager();

app.get('/', function (req, res) {
  res.send({ running: profileRunner.getRunning() });
});

app.post('/start', json(), async (req, res) => {
  const { name, profile } = req.body;

  const id = await profileRunner.start(name, profile);

  res.json({ id });
});

app.listen(3031, (err) => {
  if (err) {
    console.error(err.message);
    return;
  }

  console.log(`Listening on port 3031`);
})
