const express = require('express');
const fs = require('fs');

const loadSubFiles = (root, demoFolder) => {
  const rootEntries = Object.entries(root);

  return Object.fromEntries(rootEntries.map(([key, value]) => {
    if (typeof value === 'object') {
      return [key, loadSubFiles(value, demoFolder)];
    }

    if (typeof value === 'string' && value.startsWith('!!FILE:')) {
      return [key, fs.readFileSync(`${demoFolder}/${value.substring(7, value.length - 2)}`, 'utf-8')]
    }

    return [key, value];
  }));
};

module.exports = {
  createDemo: ({
    demoFolder,
    indices,
    router,
    templates,
    transforms,
    loadProfiles,
  }) => {
    return {
      matchesIndices: (all) => all.filter(({ index }) => indices.includes(index)),
      indices,
      router: router(express.Router()),
      templates,
      transforms: loadSubFiles(transforms, demoFolder),
      loadProfiles,
    };    
  },
};
