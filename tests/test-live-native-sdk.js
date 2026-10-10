const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname,'../pagesSub/live/wxcomponents/live-stage');
let definition, nativeContext, startCount = 0;
const native = {start(){startCount++;},stop(){},pause(){},resume(){},stopPreview(){}};
const wx = {getSystemInfo(options){options.success({SDKVersion:'3.10.0',platform:'test'});},
  getStorage(options){options.success({data:'synthetic-sdk-device'});},setStorage(){},
  createLivePusherContext(context){nativeContext=context;return native;},request(){},createLivePlayerContext(){return {stop(){}};}};
const sdkModule={exports:{}};
vm.runInNewContext(fs.readFileSync(path.join(base,'vendor/trtc-wx.js'),'utf8'),
  {module:sdkModule,exports:sdkModule.exports,wx,console,setTimeout,clearTimeout,Date,getApp:()=>({globalData:{}})});
vm.runInNewContext(fs.readFileSync(path.join(base,'index.js'),'utf8'),
  {require:()=>sdkModule.exports,Component:value=>definition=value,wx,console});
const instance = {data:JSON.parse(JSON.stringify(definition.data)),properties:{preview:false,allowedAudio:false},readyForMedia:true,
  setData(value,callback){Object.assign(this.data,value);if(callback)callback();},triggerEvent(){}};
for (const [name,method] of Object.entries(definition.methods)) instance[name]=method.bind(instance);
instance.connect({mode:'rtc',sdk_app_id:123456,room_id:123,user_id:'u4',user_sig:'synthetic',private_map_key:'room-bound-synthetic',publish:false});
assert.equal(nativeContext,instance,'official SDK must receive actual native component context');
assert.equal(startCount,1);
assert.equal(instance.data.publishing,false);
assert.match(instance.data.pusher.url,/privatemapkey=room-bound-synthetic/);
assert.equal(instance.data.pusher.enableMic,false);
instance.toggleMic();
assert.equal(instance.data.micOn,false,'cannot speak before the host enables audio in UI');
instance.stop();
assert.equal(instance.rtc,null);
assert.equal(instance.data.players.length,0);
instance.connect({mode:'cdn',playback_url:'https://play.test/stream.flv'});
assert.equal(instance.rtc,null,'spectator does not instantiate TRTC');
assert.equal(instance.data.mode,'cdn');
let recordingStopped, audioCount=0, destroyed=0;
const deleted=[];
wx.authorize=options=>options.success();
wx.getFileSystemManager=()=>({unlink:options=>deleted.push(options.filePath)});
wx.getRecorderManager=()=>({onStop(fn){recordingStopped=fn;},offStop(){},onError(){},offError(){},start(){},stop(){}});
wx.createInnerAudioContext=()=>{audioCount++;return {onEnded(){},play(){},destroy(){destroyed++;}};};
instance.testMicrophone();
instance.stop();
recordingStopped({fileSize:50,tempFilePath:'wxfile://interrupted-test.mp3'});
assert.equal(audioCount,0,'leaving must not start a late recording preview');
assert.ok(deleted.includes('wxfile://interrupted-test.mp3'),'interrupted recording must be removed');
instance.testMicrophone();
recordingStopped({fileSize:50,tempFilePath:'wxfile://preview-test.mp3'});
instance.stop();
assert.equal(destroyed,1,'leaving closes local audio preview');
assert.ok(deleted.includes('wxfile://preview-test.mp3'),'leaving removes unfinished preview file');
console.log('PASS official TRTC native adapter: context, room ticket, receive-only entry, cleanup, CDN separation');
