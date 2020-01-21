durationMultipliers = {
  s: 1000,
  m: 60000,
  h: 3600000,
}

module.exports = {
  convertToMs: (duration) => {
    const durationRegex = /([0-9]+)(s|m|h)?/;
    const durationMatch = durationRegex.exec(duration);
  
    if (!durationMatch) {
      return undefined;
    }
  
    const quantity = parseInt(durationMatch[1], 10);
    
    return quantity * (durationMultipliers[durationMatch[2]] || 1)
  },
  randomNumber: (min, max) => Math.floor(Math.random() * (max - min) + min),
  wait: (timeInMs) => new Promise(resolve => setTimeout(() => resolve(), timeInMs)),
};