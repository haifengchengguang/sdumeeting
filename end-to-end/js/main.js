/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/* global RTCRtpScriptTransform */
/* global VideoPipe */

const video1 = document.querySelector('video#video1');
const video2 = document.querySelector('video#video2');
const videoMonitor = document.querySelector('#video-monitor');

const startButton = document.querySelector('button#start');
const callButton = document.querySelector('button#call');
const hangupButton = document.querySelector('button#hangup');

const cryptoKey = document.querySelector('#crypto-key');
const cryptoOffsetBox = document.querySelector('#crypto-offset');
const banner = document.querySelector('#banner');
const muteMiddleBox = document.querySelector('#mute-middlebox');

startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

cryptoKey.addEventListener('change', setCryptoKey);
cryptoOffsetBox.addEventListener('change', setCryptoKey);
muteMiddleBox.addEventListener('change', toggleMute);

let startToMiddle;
let startToEnd;

let localStream;
// eslint-disable-next-line no-unused-vars
let remoteStream;

let hasEnoughAPIs = !!window.RTCRtpScriptTransform;

if (!hasEnoughAPIs) {
  const supportsInsertableStreams =
      !!RTCRtpSender.prototype.createEncodedStreams;

  let supportsTransferableStreams = false;
  try {
    const stream = new ReadableStream();
    window.postMessage(stream, '*', [stream]);
    supportsTransferableStreams = true;
  } catch (e) {
    console.error('Transferable streams are not supported.');
  }
  hasEnoughAPIs = supportsInsertableStreams && supportsTransferableStreams;
}

if (!hasEnoughAPIs) {
  banner.innerText = 'Your browser does not support WebRTC Encoded Transforms. ' +
  'This sample will not work.';
  if (adapter.browserDetails.browser === 'chrome') {
    banner.innerText += ' Try with Enable experimental Web Platform features enabled from chrome://flags.';
  }
  startButton.disabled = true;
  cryptoKey.disabled = true;
  cryptoOffsetBox.disabled = true;
}

function gotStream(stream) {
  console.log('Received local stream');
  video1.srcObject = stream;
  localStream = stream;
  callButton.disabled = false;
}

function gotRemoteStream(stream) {
  console.log('Received remote stream');
  remoteStream = stream;
  video2.srcObject = stream;
}

function start() {
  console.log('Requesting local stream');
  startButton.disabled = true;
  const options = {audio: true, video: true};
  navigator.mediaDevices
      .getUserMedia(options)
      .then(gotStream)
      .catch(function(e) {
        alert('getUserMedia() failed');
        console.log('getUserMedia() error: ', e);
      });
}

// We use a Worker to do the encryption and decryption.
// See
//   https://developer.mozilla.org/en-US/docs/Web/API/Worker
// for basic concepts.
// 我们使用一个Worker来进行加密和解密。
// 请看
// https://developer.mozilla.org/en-US/docs/Web/API/Worker
// 了解基本概念。
// const worker = new Worker('./js/worker.js', {name: 'E2EE worker'});
/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/*
 * This is a worker doing the encode/decode transformations to add end-to-end
 * encryption to a WebRTC PeerConnection using the Insertable Streams API.
 */

//'use strict';
let currentCryptoKey;
let useCryptoOffset = true;
let currentKeyIdentifier = 0;

// If using crypto offset (controlled by a checkbox):
// Do not encrypt the first couple of bytes of the payload. This allows
// a middle to determine video keyframes or the opus mode being used.
// For VP8 this is the content described in
// 如果使用加密偏移（由一个复选框控制）。
// 不要对有效载荷的前几个字节进行加密。这允许
// 中间确定视频关键帧或正在使用的 opus 模式。
// 对于VP8来说，这就是 "视频 "中描述的内容。
//   https://tools.ietf.org/html/rfc6386#section-9.1
// which is 10 bytes for key frames and 3 bytes for delta frames.
// For opus (where encodedFrame.type is not set) this is the TOC byte from
//对关键帧来说是10个字节，对delta帧来说是3个字节。
// 对于opus（未设置encodedFrame.type），这是TOC字节，来自于
//   https://tools.ietf.org/html/rfc6716#section-3.1
//
// It makes the (encrypted) video and audio much more fun to watch and listen to
// as the decoder does not immediately throw a fatal error.
// 它使（加密的）视频和音频在观看和聆听时更有乐趣
// 因为解码器不会立即抛出一个致命的错误。
const frameTypeToCryptoOffset = {
  key: 10,
  delta: 3,
  undefined: 1,
};

function dump(encodedFrame, direction, max = 16) {
  const data = new Uint8Array(encodedFrame.data);
  let bytes = '';
  for (let j = 0; j < data.length && j < max; j++) {
    bytes += (data[j] < 16 ? '0' : '') + data[j].toString(16) + ' ';
  }
  console.log(performance.now().toFixed(2), direction, bytes.trim(),
      'len=' + encodedFrame.data.byteLength,
      'type=' + (encodedFrame.type || 'audio'),
      'ts=' + encodedFrame.timestamp,
      'ssrc=' + encodedFrame.getMetadata().synchronizationSource,
      'pt=' + (encodedFrame.getMetadata().payloadType || '(unknown)')
  );
}

let scount = 0;
function encodeFunction(encodedFrame, controller) {
  if (scount++ < 30) { // dump the first 30 packets.//转储前30个数据包。
    dump(encodedFrame, 'send');
  }
  if (currentCryptoKey) {
    console.log(currentCryptoKey)
    const view = new DataView(encodedFrame.data);
    // Any length that is needed can be used for the new buffer.
    // 任何需要的长度都可以用于新的缓冲区。
    const newData = new ArrayBuffer(encodedFrame.data.byteLength + 5);
    const newView = new DataView(newData);

    const cryptoOffset = useCryptoOffset? frameTypeToCryptoOffset[encodedFrame.type] : 0;
    for (let i = 0; i < cryptoOffset && i < encodedFrame.data.byteLength; ++i) {
      newView.setInt8(i, view.getInt8(i));
    }
    // This is a bitwise xor of the key with the payload. This is not strong encryption, just a demo.
        // 这是对密钥和有效载荷进行的位数交换。这不是强加密，只是一个演示。
    for (let i = cryptoOffset; i < encodedFrame.data.byteLength; ++i) {
      const keyByte = currentCryptoKey.charCodeAt(i % currentCryptoKey.length);
      newView.setInt8(i, view.getInt8(i) ^ keyByte);
    }
    // Append keyIdentifier.
     // 添加keyIdentifier。
    newView.setUint8(encodedFrame.data.byteLength, currentKeyIdentifier % 0xff);
    // Append checksum
     // 添加校验和
    newView.setUint32(encodedFrame.data.byteLength + 1, 0xDEADBEEF);

    encodedFrame.data = newData;
  }
  //console.log("encode");
  controller.enqueue(encodedFrame);
}

let rcount = 0;
function decodeFunction(encodedFrame, controller) {
  if (rcount++ < 30) { // dump the first 30 packets//转储前30个数据包。
    dump(encodedFrame, 'recv');
  }
  const view = new DataView(encodedFrame.data);
  const checksum = encodedFrame.data.byteLength > 4 ? view.getUint32(encodedFrame.data.byteLength - 4) : false;
  if (currentCryptoKey) {
    if (checksum !== 0xDEADBEEF) {
      console.log('Corrupted frame received, checksum ' +
                  checksum.toString(16));
      return; // This can happen when the key is set and there is an unencrypted frame in-flight.
      // 这种情况可能发生在设置了密钥并且有一个未加密的帧在飞行的情况下。
    }
    const keyIdentifier = view.getUint8(encodedFrame.data.byteLength - 5);
    if (keyIdentifier !== currentKeyIdentifier) {
      console.log(`Key identifier mismatch, got ${keyIdentifier} expected ${currentKeyIdentifier}.`);
      return;
    }

    const newData = new ArrayBuffer(encodedFrame.data.byteLength - 5);
    const newView = new DataView(newData);
    const cryptoOffset = useCryptoOffset? frameTypeToCryptoOffset[encodedFrame.type] : 0;

    for (let i = 0; i < cryptoOffset; ++i) {
      newView.setInt8(i, view.getInt8(i));
    }
    for (let i = cryptoOffset; i < encodedFrame.data.byteLength - 5; ++i) {
      const keyByte = currentCryptoKey.charCodeAt(i % currentCryptoKey.length);
      newView.setInt8(i, view.getInt8(i) ^ keyByte);
    }
    encodedFrame.data = newData;
  } else if (checksum === 0xDEADBEEF) {
    return; // encrypted in-flight frame but we already forgot about the key.
    // 加密的飞行框架，但我们已经忘记了密钥。
  }
  controller.enqueue(encodedFrame);
}

// function handleTransform(operation, readable, writable) {
//   if (operation === 'encode') {
//     const transformStream = new TransformStream({
//       transform: encodeFunction,
//     });
//     readable
//         .pipeThrough(transformStream)
//         .pipeTo(writable);
//   } else if (operation === 'decode') {
//     const transformStream = new TransformStream({
//       transform: decodeFunction,
//     });
//     readable
//         .pipeThrough(transformStream)
//         .pipeTo(writable);
//   }
// }

// // Handler for messages, including transferable streams.
// // 消息的处理程序，包括可转移的流。
// onmessage = (event) => {
//   if (event.data.operation === 'encode' || event.data.operation === 'decode') {
//     return handleTransform(event.data.operation, event.data.readable, event.data.writable);
//   }
//   if (event.data.operation === 'setCryptoKey') {
//     if (event.data.currentCryptoKey !== currentCryptoKey) {
//       currentKeyIdentifier++;
//     }
//     currentCryptoKey = event.data.currentCryptoKey;
//     useCryptoOffset = event.data.useCryptoOffset;
//   }
// };

// Handler for RTCRtpScriptTransforms.
// RTCRtpScriptTransforms的处理程序。
// if (self.RTCTransformEvent) {
//   self.onrtctransform = (event) => {
//     const transformer = event.transformer;
//     handleTransform(transformer.options.operation, transformer.readable, transformer.writable);
//   };
// }

function setupSenderTransform(sender) {
  // if (window.RTCRtpScriptTransform) {
  //   sender.transform = new RTCRtpScriptTransform(worker, {operation: 'encode'});
  //   console.log('Created sender transform');
  //   return;
  // }

  const senderStreams = sender.createEncodedStreams();
  // Instead of creating the transform stream here, we do a postMessage to the worker. The first
  // argument is an object defined by us, the second is a list of variables that will be transferred to
  // the worker. See
  //   https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
  // If you want to do the operations on the main thread instead, comment out the code below.
  /*
  const transformStream = new TransformStream({
    transform: encodeFunction,
  });
  senderStreams.readable
      .pipeThrough(transformStream)
      .pipeTo(senderStreams.writable);
  */
   // 我们没有在这里创建转换流，而是做了一个postMessage给worker。第一个
  // 第一个参数是我们定义的一个对象，第二个参数是一个变量列表，它将被传送到
  // 工作者。参见
  // https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
  // 如果你想在主线程上进行操作，请注释掉下面的代码。
  
  const transformStream = new TransformStream({
    transform: encodeFunction,
  });
  senderStreams.readable
      .pipeThrough(transformStream)
      .pipeTo(senderStreams.writable)
  
  // const {readable, writable} = senderStreams;
  // worker.postMessage({
  //   operation: 'encode',
  //   readable,
  //   writable,
  // }, [readable, writable]);
}

function setupReceiverTransform(receiver) {

  const receiverStreams = receiver.createEncodedStreams();
  const transformStream = new TransformStream({
    transform: decodeFunction,
  });
  receiverStreams.readable
      .pipeThrough(transformStream)
      .pipeTo(receiverStreams.writable)
  //const {readable, writable} = receiverStreams;
  // worker.postMessage({
  //   operation: 'decode',
  //   readable,
  //   writable,
  // }, [readable, writable]);
}

function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  console.log('Starting call');
  // The real use case is where the middle box relays the
  // packets and listens in, but since we don't have
  // access to raw packets, we just send the same video
  // to both places.
    // 真正的用例是，中间的盒子转发数据包并监听。
  // 数据包并进行监听，但由于我们没有
  // 但由于我们不能访问原始数据包，我们只是将相同的视频
  // 到两个地方。
  // startToMiddle = new VideoPipe(localStream, true, false, e => {
  //   // Do not setup the receiver transform.
  //       // 不要设置接收方的转换。
  //   videoMonitor.srcObject = e.streams[0];
  // });
  // startToMiddle.pc1.getSenders().forEach(setupSenderTransform);
  // startToMiddle.negotiate();
  currentCryptoKey='123';
  startToEnd = new VideoPipe(localStream, true, true, (event) => {
    setupReceiverTransform(event.receiver);
    console.log('Received remote stream');
    gotRemoteStream(event.streams[0]);
  });
  startToEnd.pc1.getSenders().forEach(setupSenderTransform);
  startToEnd.negotiate();

  console.log('Video pipes created');
}

function hangup() {
  console.log('Ending call');
  // startToMiddle.close();
  startToEnd.close();
  hangupButton.disabled = true;
  callButton.disabled = false;
}

function setCryptoKey(event) {
  console.log('Setting crypto key to ' + cryptoKey.value);
  //const currentCryptoKey = cryptoKey.value;
  const currentCryptoKey='123';
  const useCryptoOffset = !cryptoOffsetBox.checked;
  if (currentCryptoKey) {
    banner.innerText = 'Encryption is ON';
  } else {
    banner.innerText = 'Encryption is OFF';
  }
  worker.postMessage({
    operation: 'setCryptoKey',
    currentCryptoKey,
    useCryptoOffset,
  });
}

function toggleMute(event) {
  video2.muted = muteMiddleBox.checked;
  videoMonitor.muted = !muteMiddleBox.checked;
}
