const { AppError } = require('../domain/errors');

class SupabaseRestRepository {
  constructor({ baseUrl, publishableKey, accessToken, organizationKey='dealworx' }) {
    if (!baseUrl || !publishableKey || !accessToken) throw new AppError('STORAGE_UNAVAILABLE','Supabase persistence is not configured',503);
    this.baseUrl=baseUrl; this.publishableKey=publishableKey; this.accessToken=accessToken; this.organizationKey=organizationKey;
  }
  headers(extra={}) {
    return { apikey:this.publishableKey, Authorization:`Bearer ${this.accessToken}`, 'Content-Type':'application/json', Accept:'application/json', ...extra };
  }
  async request(table,{method='GET',query='',body,prefer}={}) {
    const response=await fetch(`${this.baseUrl}/rest/v1/${table}${query ? `?${query}` : ''}`,{method,headers:this.headers(prefer?{Prefer:prefer}:{}),body:body===undefined?undefined:JSON.stringify(body)});
    let payload=null; try { payload=await response.json(); } catch {}
    if(!response.ok) throw new AppError('STORAGE_DENIED','Persistence request denied',response.status===401?401:response.status===403?403:503);
    return payload;
  }
  async list(table, query='') { return this.request(table,{query}); }
  async insert(table,row) {
    const scoped={...row,organization_key:row.organization_key||this.organizationKey};
    const rows=await this.request(table,{method:'POST',body:scoped,prefer:'return=representation'});
    if(!Array.isArray(rows)||rows.length!==1) throw new AppError('STORAGE_INVALID','Unexpected persistence response',503);
    return rows[0];
  }
  async update(table,id,patch) {
    const rows=await this.request(table,{method:'PATCH',query:`id=eq.${encodeURIComponent(id)}&organization_key=eq.${encodeURIComponent(this.organizationKey)}`,body:patch,prefer:'return=representation'});
    if(!Array.isArray(rows)||rows.length!==1) throw new AppError('STORAGE_DENIED','Update was not authorized',403);
    return rows[0];
  }
}
module.exports={SupabaseRestRepository};