window.LX=window.LX||{};
LX.config={
  version:'25.0.0',
  environment:'cloud-ready',
  production:true,
  apiBase:'',
  siteUrl:'https://xn--rifamilionria-deb.api.br/',
  requireCloudInProduction:true,
  supabase:{
    url:'https://ubidogquzpdvrbzbhxda.supabase.co',
    publishableKey:'sb_publishable_8NKHuVKiyGMHtKs9FYJJsQ_Wz3MEjTZ',
    anonKey:'', // legado: use somente se seu projeto ainda não tiver Publishable Key
    mediaBucket:'lx-media',
    assetBucket:'lx-assets'
  },
  localDemoAdmin:{email:'admin@lxplus.com.br',password:'Admin@1234'},
  features:{recommendations:true,preferenceProfile:true,premium:true,fuzzySearch:true,qualityGate:true,requests:true,ratings:true,analytics:true,tv:true,pwa:true,profileIdentity:true,appMode:true,cloudSync:true,realtime:true,cloudMedia:true}
};
