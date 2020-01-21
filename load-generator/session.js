const axios = require('axios');
const uuidv4 = require('uuid/v4');
const EventEmitter = require('events');

const { randomNumber, wait } = require('./common/utilities');
const { generateProbabilitySet } = require('./common/probability-set');

const calculateJitter = (timeInMs) => {
  const jitter = timeInMs / 3;

  return randomNumber(timeInMs - jitter, timeInMs + jitter);
};

const doRequest = async ({ id, agent }, { request }) => {
  const url = `http://localhost:3030${request}`;

  const result = await axios({
    url,
    validateResponse: () => true,
    headers: {
      'x-session-id': id,
      'User-Agent': agent,
    },
  });

  return result;
};

const defaultUserAgents = [
  // Mac OSX => 8%
  { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/601.3.9 (KHTML, like Gecko) Version/9.0.2 Safari/601.3.9', weight: 0.02 },
  { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_4) AppleWebKit/600.7.12 (KHTML, like Gecko) Version/8.0.7 Safari/600.7.12', weight: 0.06 },
  // Windows => 35%
  { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36', weight: 0.35 },
  // Linux => 4%
  { agent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:15.0) Gecko/20100101 Firefox/15.0.1', weight: 0.04 },
  // iPhone => 18%
  { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1', weight: 0.09 },
  { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1', weight: 0.09 },
  // android => rest (35%)
  { agent: 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G960F Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36' },
];

const pickRandomAgent = ({
  userAgents = defaultUserAgents,
}) => generateProbabilitySet(userAgents.map(agent => typeof agent === 'string'
  ? { agent }
  : agent)).pick();

module.exports = (profile) => {
  const id = uuidv4();
  const remainingSteps = [...profile.requests];
  const events = new EventEmitter();
  const { agent } = pickRandomAgent(profile);

  const doNextStep = async () => {
    const nextStep = remainingSteps.shift();

    if (!nextStep) {
      events.emit('complete', id);
      return;
    }

    events.emit('requestStarted', id);

    await doRequest({ id, agent: agent }, nextStep);

    events.emit('requestCompleted', id);

    await wait(calculateJitter(nextStep.waitForNext));

    doNextStep();
  };

  return {
    id,
    start: () => doNextStep(),
    on: (...args) => events.on(...args),
  };
};
