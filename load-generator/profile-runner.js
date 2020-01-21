const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');

const createSession = require('./session');
const { convertToMs } = require('./common/utilities');
const { generateProbabilitySet } = require('./common/probability-set');

const pickProfile = (probabilitySet, profiles) => {
  const profile = probabilitySet.pick();

  const [fullProfile] = profiles.filter(({ name }) => name === profile.name);

  return fullProfile;
};

const calculateFinish = (maxDuration) => {
  if (!maxDuration) {
    return;
  }

  const duration = convertToMs(maxDuration);

  if (!duration) {
    return;
  }

  return Date.now() + duration;
};

module.exports = ({ defaultConcurrentSessions = 1, maxSessions, maxDuration, profiles }) => {
  const id = uuidv4();
  const events = new EventEmitter();
  let totalSessions = 0;
  let totalRequests = 0;
  const openSessions = {};
  const finish = calculateFinish(maxDuration);
  const targetSessions = defaultConcurrentSessions;
  const probabilitySet = generateProbabilitySet(profiles);
  let nextTick;

  const tick = () => {
    let missingSessions = targetSessions - Object.keys(openSessions).length;

    if (maxSessions && missingSessions + totalSessions > maxSessions) {
      missingSessions = maxSessions - totalSessions;

      events.emit('complete');
      return;
    }

    if (maxDuration && finish && Date.now() >= finish) {
      missingSessions = 0;

      if (!Object.keys(openSessions).length) {
        events.emit('complete');
        return;
      }
    }

    for(let x = 0; x < missingSessions; x++) {
      const profile = pickProfile(probabilitySet, profiles);

      const newSession = createSession(profile);

      openSessions[newSession.id] = newSession;
      console.log(`  Starting Session \t${profile.name}\t\t${newSession.id}`);

      totalSessions += 1;

      newSession.on('requestStarted', () => {
        totalRequests += 1;
      });

      newSession.on('complete', (id) => {
        console.log(`  Finishing Session \t${profile.name}\t\t${newSession.id}`);
        delete openSessions[id];
      });

      newSession.start();
    }

    nextTick = setTimeout(tick, 1000);
  };

  return {
    id,
    start: () => tick(),
    stop: () => clearTimeout(nextTick),
    on: (...args) => events.on(...args),
    getStats: () => ({
      currentSessions: Object.keys(openSessions).length,
      totalSessions: totalSessions,
      totalRequests,
    }),
    getStatus: () => ({
      status: (nextTick ? 'running' : 'stopped'),
    }),
  };
};
