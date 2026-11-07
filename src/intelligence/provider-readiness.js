'use strict';
/** Safe, deterministic provider decision: never assume a provider is live. */
const {PROVIDERS}=require('./provider-router');
function evaluateProviderReadiness({provider,credentialsPresent=false,approved=false,adapterTested=false,providerReceiptVerified=false,tenantSecurityTested=false}={}){
 if(!PROVIDERS[provider])throw new Error('Unknown provider');
 const checks=Object.freeze({credentialsPresent:credentialsPresent===true,approved:approved===true,adapterTested:adapterTested===true,providerReceiptVerified:providerReceiptVerified===true,tenantSecurityTested:tenantSecurityTested===true});
 const missing=Object.keys(checks).filter(k=>!checks[k]);
 return Object.freeze({provider,ready:missing.length===0,missing,checks});
}
module.exports={evaluateProviderReadiness};
