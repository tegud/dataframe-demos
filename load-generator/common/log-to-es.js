const { Client } = require('@elastic/elasticsearch');
const uuidv4 = require('uuid/v4');

const createLogBuffer = ({
  maxBufferLength = 1000,
  flushRate = 1000,
} = {}) => {
  let items = [];
  let flushTimeout;
  let esClient;

  const flush = async () => {
    clearTimeout(flushTimeout);
    flushTimeout = undefined;

    if (!esClient) {
      console.warn('No ES Client configured');
    } else {
      try {
        await esClient.bulk({
          body: items.reduce((all, doc) => [
            ...all,
            { index: { _index: 'booking-process', _id: uuidv4() } },
            doc,
          ], []),
        });
      } catch (e) {
        console.error(`Error storing to es: ${e.message}`);
      }
    }

    items = [];
  };

  return {
    push: (item) => {
      if (!flushTimeout) {
        flushTimeout = setTimeout(flush, flushRate);
      }

      items.push(item);

      if (items.length >= maxBufferLength) {
        flush();
      }
    },
    flush,
    setElasticsearchClient: (client) => esClient = client,
  };
};

const logBuffer = createLogBuffer();

const log = (level, message, args) => {
  const logObject = {
    '@timestamp': new Date().toISOString(),
    level,
    message,
    ...args
  };

  logBuffer.push(logObject);
};

module.exports = {
  configure: (client) => logBuffer.setElasticsearchClient(client),
  info: log.bind(undefined, 'info'),
  warn: log.bind(undefined, 'warn'),
  error: log.bind(undefined, 'error'),
  flush: () => loggBuffer.flush(),
};
