const fs = require('fs');
const path = require('path');

class JsonRepository {
  constructor({ dataDir, fileName }) {
    this.filePath = path.join(dataDir, fileName);
  }
  list() { return JSON.parse(fs.readFileSync(this.filePath, 'utf8')); }
  replaceAll(records) { fs.writeFileSync(this.filePath, JSON.stringify(records, null, 2)); }
  findById(id) { return this.list().find(row => String(row.id) === String(id)) || null; }
  prepend(record) { const rows=this.list(); rows.unshift(record); this.replaceAll(rows); return record; }
}

function legacyRepositories(rootDir) {
  const dataDir = path.join(rootDir, 'data');
  return {
    deals: new JsonRepository({dataDir,fileName:'deals.json'}),
    signals: new JsonRepository({dataDir,fileName:'signals.json'}),
    posts: new JsonRepository({dataDir,fileName:'posts.json'})
  };
}

module.exports = { JsonRepository, legacyRepositories };