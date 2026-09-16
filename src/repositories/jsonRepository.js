const fs = require('fs');
const path = require('path');

class JsonRepositoryError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'JsonRepositoryError';
    this.cause = cause;
  }
}

class JsonRepository {
  constructor({ dataDir, fileName }) {
    const resolvedDir = path.resolve(dataDir);
    const resolvedPath = path.resolve(resolvedDir, fileName);
    if (!resolvedPath.startsWith(`${resolvedDir}${path.sep}`)) throw new Error('Invalid repository file path');
    this.filePath = resolvedPath;
  }

  list() {
    let raw;
    try { raw = fs.readFileSync(this.filePath, 'utf8'); }
    catch (error) { throw new JsonRepositoryError(`Unable to read ${path.basename(this.filePath)}`, error); }
    let records;
    try { records = JSON.parse(raw); }
    catch (error) { throw new JsonRepositoryError(`Invalid JSON in ${path.basename(this.filePath)}`, error); }
    if (!Array.isArray(records)) throw new JsonRepositoryError(`Expected array in ${path.basename(this.filePath)}`);
    return records;
  }

  replaceAll(records) {
    if (!Array.isArray(records)) throw new JsonRepositoryError('Repository records must be an array');
    const temporary = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(records, null, 2), { encoding: 'utf8', flag: 'wx' });
      fs.renameSync(temporary, this.filePath);
    } catch (error) {
      try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch (_) {}
      throw new JsonRepositoryError(`Unable to write ${path.basename(this.filePath)}`, error);
    }
  }

  findById(id) { return this.list().find(row => String(row.id) === String(id)) || null; }
  prepend(record) { const rows = this.list(); rows.unshift(record); this.replaceAll(rows); return record; }
}

function legacyRepositories(dataDir) {
  return {
    deals: new JsonRepository({ dataDir, fileName: 'deals.json' }),
    signals: new JsonRepository({ dataDir, fileName: 'signals.json' }),
    posts: new JsonRepository({ dataDir, fileName: 'posts.json' })
  };
}

module.exports = { JsonRepository, JsonRepositoryError, legacyRepositories };