/* Replaceable, on-device sensor adapters. No frame upload, recording, AI proxy or
   identity integration. A single session serialises inference and owns its stream. */
var CameraPhysicsVision=(function(){
  'use strict';
  var scripts={},backendReady=null,HAND_BASE='https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/',WASM_BASE='https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/';
  function globalValue(name){return name.split('.').reduce(function(value,key){return value&&value[key];},window);}
  function deadline(promise,ms,message,onLate){return new Promise(function(resolve,reject){var expired=false,id=setTimeout(function(){expired=true;reject(Error(message));},ms);Promise.resolve(promise).then(function(value){clearTimeout(id);if(expired){if(onLate)onLate(value);}else resolve(value);},function(e){clearTimeout(id);if(!expired)reject(e);});});}
  function script(url,globalName){if(globalValue(globalName))return Promise.resolve(globalValue(globalName));if(scripts[url])return scripts[url];scripts[url]=new Promise(function(resolve,reject){var s=document.createElement('script'),timer=setTimeout(function(){s.remove();reject(Error('Model download timed out. Check your connection and retry.'));},30000);s.src=url;s.crossOrigin='anonymous';s.onload=function(){clearTimeout(timer);globalValue(globalName)?resolve(globalValue(globalName)):reject(Error('Model library unavailable.'));};s.onerror=function(){clearTimeout(timer);s.remove();reject(Error('Could not download the vision models. Check your connection and retry.'));};document.head.appendChild(s);}).catch(function(e){delete scripts[url];throw e;});return scripts[url];}
  function prepareBackend(){if(!backendReady)backendReady=(async function(){try{await script(WASM_BASE+'tf-backend-wasm.js','tf.wasm');window.tf.wasm.setWasmPaths(WASM_BASE);if(!await window.tf.setBackend('wasm'))throw Error('WASM unavailable');}catch(e){if(!await window.tf.setBackend('webgl'))await window.tf.setBackend('cpu');}await window.tf.ready();})().catch(function(e){backendReady=null;throw e;});return backendReady;}
  function createSession(video,callbacks,adapters){
    callbacks=callbacks||{};adapters=adapters||{};var active=false,token=0,stream=null,detector=null,hand=null,timer=0,busy=false,closing=false,lastObjects=0,lastHands=[],frame=document.createElement('canvas');frame.width=640;frame.height=360;var context=frame.getContext('2d'),samples=0;
    function state(s,message){if(callbacks.state)callbacks.state(s,message);}
    function live(t){return active&&token===t;}
    function disposeModels(){if(busy){closing=true;return;}closing=false;if(hand){try{Promise.resolve(hand.close()).catch(function(){});}catch(e){}hand=null;}if(detector){try{detector.dispose();}catch(e){}detector=null;}}
    function stop(message){active=false;token++;clearTimeout(timer);timer=0;if(stream){stream.getTracks().forEach(function(t){t.onended=null;t.stop();});stream=null;}video.pause();video.srcObject=null;lastHands=[];disposeModels();state('off',message||'Camera off. Nothing is recorded.');}
    async function start(){if(active)return;if(busy){state('error','The previous model is still closing. Retry in a moment.');return;}active=true;closing=false;var t=++token;state('permission','Waiting for camera permission…');
      try{
        if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw Error('Camera unavailable. Use HTTPS in a browser with camera support.');
        var next=await (adapters.camera||function(){return navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:360},facingMode:'user'},audio:false});})();
        if(!live(t)){next.getTracks().forEach(function(x){x.stop();});return;}stream=next;stream.getTracks().forEach(function(x){x.onended=function(){if(live(t))stop('Camera disconnected. Reconnect it, then start again.');};});video.srcObject=stream;await video.play();if(!live(t))return;
        state('loading','Camera ready. Downloading on-device models…');
        var make=adapters.load||async function(){await script('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js','tf');await prepareBackend();await script('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js','cocoSsd');await script(HAND_BASE+'hands.js','Hands');var d=await window.cocoSsd.load({base:'lite_mobilenet_v2'});try{return {detector:d,hand:new window.Hands({locateFile:function(f){return HAND_BASE+f;}})};}catch(e){d.dispose();throw e;}};
        function release(models){try{models.detector.dispose();Promise.resolve(models.hand.close()).catch(function(){});}catch(e){}}
        var models=await deadline(make(),60000,'Model loading timed out. Stop other camera apps and retry.',release);if(!live(t)){release(models);return;}
        detector=models.detector;hand=models.hand;hand.setOptions({maxNumHands:2,modelComplexity:0,minDetectionConfidence:.6,minTrackingConfidence:.5,selfieMode:false});hand.onResults(function(result){if(live(t))lastHands=(result.multiHandLandmarks||[]).map(function(lm){return {landmarks:lm.map(function(p){return {x:p.x,y:p.y};})};});});
        lastObjects=-Infinity;samples=0;state('running','Look for a book, phone, bottle or ball. Keep the whole object in view.');pump(t);
      }catch(e){if(!live(t))return;stop();state('error',e.name==='NotAllowedError'?'Camera permission was denied. Allow it in browser settings, then retry.':e.name==='NotFoundError'?'No camera found. Connect a camera and retry.':e.name==='NotReadableError'?'Camera is busy in another app. Close it there and retry.':e.message||'Camera analysis could not start. Please retry.');}
    }
    async function pump(t){if(!live(t))return;var start=performance.now();busy=true;
      try{if(video.readyState>=2&&!document.hidden){var w=video.videoWidth||640,h=video.videoHeight||360;frame.width=Math.min(640,w);frame.height=Math.round(frame.width*h/w);context.drawImage(video,0,0,frame.width,frame.height);await deadline(hand.send({image:frame}),20000,'Hand tracking timed out.');if(!live(t))return;
        if(performance.now()-lastObjects>=280){var result=await deadline(detector.detect(frame,12,.55),20000,'Object detection timed out.');if(!live(t))return;var completed=performance.now();lastObjects=start;samples++;if(callbacks.frame)callbacks.frame({time:start,width:frame.width,height:frame.height,hands:lastHands,objects:result.map(function(o){return {class:o.class,score:o.score,bbox:[o.bbox[0]/frame.width,o.bbox[1]/frame.height,o.bbox[2]/frame.width,o.bbox[3]/frame.height]};}),latency:completed-start,samples:samples});}
      }}catch(e){if(live(t)){stop();state('error','Tracking stopped safely. '+(e.message||'Your device could not run the model.')+' Retry or use Hands / Build.');}}
      finally{busy=false;if(closing)disposeModels();if(live(t))timer=setTimeout(function(){pump(t);},Math.max(40,125-(performance.now()-start)));}
    }
    return {start:start,stop:stop,isActive:function(){return active;},capabilities:{handLandmarks:true,objectBoxes:true,segmentation:false,depth:false,orientation:false}};
  }
  return {createSession:createSession};
})();
