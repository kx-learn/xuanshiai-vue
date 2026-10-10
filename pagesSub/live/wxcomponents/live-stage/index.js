// Native component gives the official SDK the actual WeChat component context.
const TRTC = require('./vendor/trtc-wx.js');
Component({
  properties: {
    credentials: { type: Object, value: null, observer(value) { if (this.readyForMedia) this.connect(value); } },
    preview: { type: Boolean, value: false },
    allowedAudio: { type: Boolean, value: false, observer(value) { if (!value && !this.data.preview) this.setData({ micOn: false }); } }
  },
  data: { mode: '', pusher: {}, players: [], playbackUrl: '', publishing: false, micOn: false,
    cameraOn: true, cameraReady: false, microphoneReady: false, notice: '音视频仅在微信真机及已开通权限的小程序中可用' },
  lifetimes: {
    ready() { this.readyForMedia = true; if (this.properties.credentials) this.connect(this.properties.credentials); },
    detached() { this.stop(); this.readyForMedia = false; }
  },
  pageLifetimes: { hide() { this.stop(); } },
  methods: {
    stop() {
      this.connectionGeneration = (this.connectionGeneration || 0) + 1;
      if (this.rtc) { this.rtc.exitRoom(); this.rtc = null; }
      if (this.previewContext) { this.previewContext.stopPreview({}); this.previewContext = null; }
      if (this.recorder) { this.recorder.stop(); this.recorder = null; }
      this.releasePreviewAudio();
      this.setData({ pusher: {}, players: [], playbackUrl: '', publishing: false, mode: '', micOn: false });
    },
    releasePreviewAudio() {
      if (this.audio) { this.audio.destroy(); this.audio = null; }
      if (this.previewAudioPath) {
        wx.getFileSystemManager().unlink({ filePath: this.previewAudioPath, fail() {} });
        this.previewAudioPath = '';
      }
    },
    connect(value) {
      this.stop();
      if (!value) return;
      if (value.mode === 'cdn') {
        this.setData({ mode: 'cdn', playbackUrl: value.playback_url, notice: '观众观看存在延迟，不参与本轮选择' });
        return;
      }
      const rtc = new TRTC(this);
      this.rtc = rtc;
      rtc.setLogLevel(4); // Suppress SDK console payloads containing temporary credentials.
      const refresh = () => { if (this.rtc === rtc) this.setData({ players: rtc.getPlayerList() }); };
      const listen = (event, callback) => rtc.on(rtc.EVENT[event], callback);
      for (const [event, key, muted] of [['REMOTE_VIDEO_ADD','muteVideo',false], ['REMOTE_VIDEO_REMOVE','muteVideo',true],
        ['REMOTE_AUDIO_ADD','muteAudio',false], ['REMOTE_AUDIO_REMOVE','muteAudio',true]]) {
        listen(event, e => { if (this.rtc !== rtc) return; const player = e.data.player;
          this.setData({ players: rtc.setPlayerAttributes(player.id, { [key]: muted }) }); });
      }
      listen('REMOTE_USER_JOIN', refresh); listen('REMOTE_USER_LEAVE', refresh);
      listen('LOCAL_JOIN', () => { this.setData({ notice: '已连接实时互动房间' }); this.triggerEvent('connected'); });
      listen('KICKED_OUT', () => { this.stop(); this.fail('音视频房间已变更，请重新连接'); });
      listen('ERROR', () => this.fail('音视频连接异常，请检查权限、网络及云资源后重试'));
      rtc.createPusher({ enableMic: false, enableCamera: value.publish, autopush: false });
      const pusher = rtc.enterRoom({ sdkAppID: value.sdk_app_id, roomID: value.room_id, userID: value.user_id,
        userSig: value.user_sig, privateMapKey: value.private_map_key, enableMic: false, enableCamera: value.publish,
        scene: 'live', minBitrate: 180, maxBitrate: 450 });
      this.setData({ mode: 'rtc', publishing: value.publish, pusher, cameraOn: true, notice: '正在连接音视频…' },
        () => { if (this.rtc === rtc) rtc.getPusherInstance().start({ fail: () => this.fail('推流未能启动，请重试') }); });
    },
    startPreview() {
      wx.authorize({ scope: 'scope.camera', success: () => {
        this.previewContext = wx.createLivePusherContext(this);
        this.previewContext.startPreview({ fail: () => this.fail('摄像头预览失败；请在真机检查小程序音视频权限') });
      }, fail: () => this.fail('请在小程序设置中允许摄像头权限') });
    },
    testMicrophone() {
      if (this.recorder) return;
      wx.authorize({ scope: 'scope.record', success: () => {
        const generation = this.connectionGeneration || 0;
        const recorder = wx.getRecorderManager(); this.recorder = recorder;
        const stopped = result => {
          recorder.offStop(stopped); recorder.offError(failed); this.recorder = null;
          this.releasePreviewAudio();
          this.previewAudioPath = result.tempFilePath;
          if (!this.readyForMedia || generation !== (this.connectionGeneration || 0)) { this.releasePreviewAudio(); return; }
          this.setData({ microphoneReady: result.fileSize > 0 }); this.deviceResult();
          if (result.tempFilePath) {
            const audio = wx.createInnerAudioContext(); this.audio = audio; audio.src = result.tempFilePath;
            audio.onEnded(() => this.releasePreviewAudio());
            audio.play();
          }
        };
        const failed = () => { recorder.offStop(stopped); recorder.offError(failed); this.recorder = null; this.fail('麦克风录音失败，请检查权限'); };
        recorder.onStop(stopped); recorder.onError(failed);
        recorder.start({ duration: 3000, format: 'mp3' });
      }, fail: () => this.fail('请在小程序设置中允许麦克风权限') });
    },
    deviceResult() { this.triggerEvent('devicecheck', { passed: this.data.cameraReady && this.data.microphoneReady }); },
    toggleMic() {
      if (!this.properties.allowedAudio) { this.fail('请举手并等待主持安排发言'); return; }
      this.setData({ micOn: !this.data.micOn });
    },
    toggleCamera() { this.setData({ cameraOn: !this.data.cameraOn }); },
    fail(message) { this.setData({ notice: message }); this.triggerEvent('mediaerror', { message }); },
    pusherState(e) {
      if (this.properties.preview && e.detail.code === 1007) { this.setData({ cameraReady: true }); this.deviceResult(); }
      if (e.detail.code < 0) this.fail('设备或网络异常（' + e.detail.code + '），请重新检测');
      if (this.rtc) this.rtc.pusherEventHandler(e);
    },
    pusherNetwork(e) { if (this.rtc) this.rtc.pusherNetStatusHandler(e); },
    pusherError(e) { if (this.rtc) this.rtc.pusherErrorHandler(e); this.fail('设备权限或音视频组件不可用'); },
    playerState(e) { if (this.rtc) this.rtc.playerEventHandler(e); },
    playerNetwork(e) { if (this.rtc) this.rtc.playerNetStatus(e); },
    playerError() { this.fail('画面暂时不可用，请重新连接'); }
  }
});
