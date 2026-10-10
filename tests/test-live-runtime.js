const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');

async function main() {
  const storage = new Map(), cache = new Map(), sent = [];
  let respond = options => options.success({statusCode: 200, data: {items: [], can_manage: false}});
  let messageHandler, socketClosed = false, updateCount = 0;
  const uni = {
    getStorageSync: key => storage.get(key) ?? '', setStorageSync: (key,value) => storage.set(key,value),
    removeStorageSync: key => storage.delete(key), request: options => {sent.push(options);respond(options);},
    connectSocket: () => ({onOpen(){}, onError(){}, onClose(){}, onMessage(handler){messageHandler=handler;}, close(){socketClosed=true;}})
  };
  function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = {exports:{}}; cache.set(file,module);
    const code = babel.transformSync(fs.readFileSync(file,'utf8'), {filename:file,babelrc:false,configFile:false,
      plugins:[[require('@babel/plugin-transform-typescript'),{allExtensions:true}],require('@babel/plugin-transform-modules-commonjs')]}).code;
    vm.runInNewContext('(function(require,module,exports){'+code+'\n})', {uni,console,Date,Math,JSON,setTimeout,clearTimeout})
      (id=>load(id.startsWith('@/') ? id.slice(2) : path.relative(root,path.resolve(path.dirname(file),id))),module,module.exports);
    return module.exports;
  }
  const config = load('api/config.uts'), api = load('api/live-v2.uts');
  config.USE_MOCK = false;
  storage.set(config.CURRENT_USER_ID_KEY, '1'); config.setAuthTokens('synthetic-test-token');
  assert.equal((await api.getLiveList()).items.length,0);
  // HBuilderX constructs UTS optional fields as null, not omitted JS properties.
  const schedule = {...api.liveCommand('schedule',0),target_id:null,targets:null,value:null,seconds:null,
    display_name:null,introduction:null,consent_version:null,device_checked:null,reason:null};
  await api.sendLiveCommand(1,schedule);
  assert.deepEqual(Object.keys(sent.at(-1).data).sort(),['action','command_id','expected_revision']);
  const emptyChoice={...schedule,action:'choose',targets:[],value:false};
  await api.sendLiveCommand(1,emptyChoice);
  assert.deepEqual(JSON.parse(JSON.stringify(sent.at(-1).data.targets)),[],'empty selection is intentional');
  assert.equal(sent.at(-1).data.value,false,'false means retract/decline, not an absent field');
  sent.length=0;
  const cmd = api.liveCommand('choose', 12); cmd.targets = [8,9];
  respond = options => options.success({statusCode:409,data:{detail:'场次已更新'}});
  await assert.rejects(api.sendLiveCommand(1,cmd),/场次已更新/);
  assert.equal(sent.filter(item=>item.url.endsWith('/commands')).length,1,'expired choices must not be automatically replayed');
  assert.equal(sent.at(-1).data.expected_revision,12);
  respond = options => options.success({statusCode:201,data:{id:101}});
  assert.equal(await api.applyFromLive({id:71,peer_id:8},'场后自主申请'),101);
  assert.equal(sent.at(-1).data.live_opportunity_id,71);
  assert.equal(sent.at(-1).data.skipQuota,undefined);
  const stop = api.subscribeLive(1,()=>updateCount++,()=>{});
  messageHandler({data:JSON.stringify({type:'snapshot',snapshot:{revision:2}})});
  assert.equal(updateCount,1);
  storage.set(config.CURRENT_USER_ID_KEY,'2');
  messageHandler({data:JSON.stringify({type:'snapshot',snapshot:{revision:3}})});
  assert.equal(updateCount,1); assert.equal(socketClosed,true); stop();
  respond = options => {storage.set(config.CURRENT_USER_ID_KEY,'3');options.success({statusCode:200,data:{id:1}});};
  await assert.rejects(api.getLiveSession(1),/账号已切换/);
  config.USE_MOCK = true;
  await assert.rejects(api.getLiveList(),/真实后端/);
  console.log('PASS live UTS runtime: real request serialization, stale commands, free source, account isolation, no fake success');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
