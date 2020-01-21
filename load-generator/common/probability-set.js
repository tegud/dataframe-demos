const { randomNumber } = require('./utilities');

const buildSet = (items) => {
  const probabilities = items
    .filter(({ weight }) => typeof weight !== 'undefined');
  const itemsToSplit = items
    .filter(({ weight }) => typeof weight === 'undefined');
  const probabilitiesToDivide = probabilities.reduce((total, { weight }) => (total - (weight * 100) || 0), 100)

  const allProbabilities = [
    ...probabilities,
    ...itemsToSplit.map(profile => ({
      weight: (probabilitiesToDivide / itemsToSplit.length) / 100,
      ...profile,
    })),
  ];

  const calculatedProbabilities = [];
  let i = 0;
  let total = 0;

  for(let { weight, ...rest } of allProbabilities) {
    total += weight * 100;
    i += 1;

    const max = i !== allProbabilities.length ? total : undefined;

    calculatedProbabilities.push(({ max, ...rest }));
  }

  return calculatedProbabilities;
};

module.exports = {
  generateProbabilitySet: (items) => {
    const probabilities = buildSet(items);
    const pick = () => {
      const number = randomNumber(0, 100);
      const [item] = probabilities.filter(({ max }) => number < max || typeof max === 'undefined');
    
      return item;
    };
    
    return { pick };
  },
};