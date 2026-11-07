'use strict';
const STATES = new Set(['verified','attributed','inference','disputed','unresolved']);
function auditClaim(claim) {
  if (!claim || typeof claim !== 'object' || typeof claim.text !== 'string' || !claim.text.trim()) throw new Error('Claim text required');
  if (!STATES.has(claim.status)) throw new Error('Invalid evidence status');
  if (!Array.isArray(claim.sources)) throw new Error('Source list required');
  const sources = claim.sources.map(s => {
    if (!s || typeof s.id !== 'string' || !s.id.trim() || typeof s.title !== 'string' || !s.title.trim()) throw new Error('Invalid source');
    return { id:s.id, title:s.title, supports:s.supports === true, independent:s.independent === true };
  });
  const supporting = sources.filter(s=>s.supports);
  const defects=[];
  if (claim.status === 'verified' && !supporting.length) defects.push('VERIFIED_WITHOUT_SUPPORT');
  if (claim.status === 'verified' && !supporting.some(s=>s.independent)) defects.push('VERIFIED_WITHOUT_INDEPENDENT_SUPPORT');
  if (claim.status === 'attributed' && !supporting.length) defects.push('ATTRIBUTED_WITHOUT_SOURCE');
  if (new Set(sources.map(s=>s.id)).size !== sources.length) defects.push('DUPLICATE_SOURCE_ID');
  return Object.freeze({claim:claim.text,status:claim.status,sourceCount:sources.length,supportCount:supporting.length,defects:Object.freeze(defects),pass:defects.length===0});
}
function auditDossier(claims){
  if(!Array.isArray(claims)) throw new Error('Claims array required');
  const results=claims.map(auditClaim);
  return Object.freeze({pass:results.every(r=>r.pass),results,failures:results.filter(r=>!r.pass).length});
}
module.exports={auditClaim,auditDossier};
