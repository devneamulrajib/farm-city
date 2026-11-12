'use strict';

import('./src/index.js').catch((err) => {
  const label = err && (err.code || err.name || 'Error');
  console.error('Farm City failed to start:', label);
  process.exit(1);
});
