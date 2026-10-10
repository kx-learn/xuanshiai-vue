const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const babel=require('@babel/core');
const {load}=require('./live-demo-loader.cjs')();
const {isLiveDemoRoute}=load('utils/liveDemoRoute.uts');
const source=fs.readFileSync(path.join(__dirname,'../App.uvue'),'utf8').split('<script setup lang="uts">')[1].split('</script>')[0]
  .replace(/\s*import[\s\S]*?from\s+['"][^'"]+['"]/g,'');
const code=babel.transformSync(source,{filename:'demo-launch.ts',plugins:['@babel/plugin-transform-typescript'],configFile:false,babelrc:false}).code;
let launch,show,route='pagesSub/live/lobby',query={mode:'demo'};
const writes=[],routes=[];
const ctx={isLiveDemoRoute,console:{log(){}},FASTAPI_AUTO_ENTER_COMMUNITY:true,FASTAPI_DEV_ACCESS_TOKEN:'test-only',FASTAPI_DEV_USER_ID:1,
  getAccessToken:()=>'',setAuthTokens:()=>writes.push('token'),getCurrentPages:()=>[{route,options:query}],
  onLaunch:fn=>launch=fn,onShow:fn=>show=fn,onHide(){},onLastPageBackPress(){},onExit(){},setTimeout:fn=>fn(),
  uni:{getStorageSync:()=> 'parent',setStorageSync:()=>writes.push('storage'),switchTab:x=>routes.push(x.url),reLaunch:x=>{routes.push(x.url);x.complete()}}};
vm.runInNewContext(code,ctx);
launch({path:route,query});show();
assert.deepEqual(writes,[],'explicit demo cold launch must not write development login');
assert.deepEqual(routes,[],'parent identity must not redirect away from explicit demo');
query={};show();assert.ok(routes.includes('/pages/parent/parent'),'normal live route keeps parent routing');
routes.length=0;route='pages/profile/profile';query={mode:'demo'};show();
assert.ok(routes.includes('/pages/parent/parent'),'query alone never exempts other pages');
console.log('PASS demo launch: no development login writes; parent bypass limited to explicit live demo');
