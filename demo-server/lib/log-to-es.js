const { Client } = require('@elastic/elasticsearch');
const uuidv4 = require('uuid/v4');

const config = require('./config');

module.exports = {
  configure: (client) => {
  },
  buildLogger: (index) => {
    const esClient = new Client({ node: config.elasticsearch.host });

    const createLogBuffer = ({
      maxBufferLength = 1000,
      flushRate = 1000,
    } = {}) => {
      let items = [];
      let flushTimeout;
    
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
                { index: { _index: index, _id: uuidv4() } },
                doc,
              ], []),
            });
          } catch (e) {
            console.error(`Error storing to es: ${e.message}`);
            console.log(e.meta.body.error);
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

    return {
      info: log.bind(undefined, 'info'),
      warn: log.bind(undefined, 'warn'),
      error: log.bind(undefined, 'error'),
      flush: () => logBuffer.flush(),
    };
  },
};
