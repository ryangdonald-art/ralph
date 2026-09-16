class ListService {
  constructor(repository) { this.repository = repository; }
  list() { return this.repository.list(); }
}

class DealService extends ListService {
  create(input) {
    const deals = this.repository.list();
    const nextId = deals.length ? Math.max(...deals.map(d => Number(d.id) || 0)) + 1 : 1;
    return this.repository.prepend({ id: nextId, ...input });
  }
}

function createServices(repositories) {
  return {
    deals: new DealService(repositories.deals),
    signals: new ListService(repositories.signals),
    posts: new ListService(repositories.posts)
  };
}

module.exports = { ListService, DealService, createServices };