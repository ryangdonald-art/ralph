'use strict';
const crypto=require('node:crypto');
const FIELDS=['runId','role','configurationVersion','provider','providerRunId','completedAt'];
function canonical(receipt){
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))throw new Error('Receipt required');
  const values=FIELDS.map(k=>{
    if(typeof receipt[k]!=='string'||!receipt[k].trim())throw new Error('Missing receipt field: '+k);
    return receipt[k];
  });
  if(!Number.isFinite(Date.parse(receipt.completedAt)))throw new Error('Invalid receipt time');
  return JSON.stringify(values);
}
function signReceipt(receipt,key){
  if(typeof key!=='string'||key.length<32)throw new Error('Signing key too short');
  const payload=canonical(receipt);
  return crypto.createHmac('sha256',key).update(payload).digest('hex');
}
function verifyReceipt(receipt,signature,key){
  if(typeof signature!=='string'||!/^[a-f0-9]{64}$/i.test(signature))return false;
  const expected=signReceipt(receipt,key);
  return crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(signature,'hex'));
}
module.exports={canonical,signReceipt,verifyReceipt};
