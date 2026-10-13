const fs = require('node:fs');
const { retrieveOperatingMemory } = require('../src/services/operatingMemory');
try {
  const request = JSON.parse(fs.readFileSync(0, 'utf8'));
  process.stdout.write(`${JSON.stringify(retrieveOperatingMemory(request), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`Operating memory blocked: ${error.message}\n`);
  process.exitCode = 1;
}
