'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {evaluateProviderReadiness}=require('../src/intelligence/provider-readiness');
test('unknown provider rejected',()=>assert.throws(()=>evaluateProviderReadiness({provider:'imaginary'})));
test('no credentials means blocked',()=>assert.equal(evaluateProviderReadiness({provider:'openai'}).ready,false));
test('credentials without owner approval insufficient',()=>assert(evaluateProviderReadiness({provider:'anthropic',credentialsPresent:true}).missing.includes('approved')));
test('self reported receipt not enough when other controls missing',()=>assert.equal(evaluateProviderReadiness({provider:'xai',providerReceiptVerified:true}).ready,false));
test('fully verified provider ready',()=>assert.equal(evaluateProviderReadiness({provider:'meta',credentialsPresent:true,approved:true,adapterTested:true,providerReceiptVerified:true,tenantSecurityTested:true}).ready,true));
test('truthy strings cannot bypass checks',()=>assert.equal(evaluateProviderReadiness({provider:'openai',credentialsPresent:'yes',approved:'yes',adapterTested:'yes',providerReceiptVerified:'yes',tenantSecurityTested:'yes'}).ready,false));
