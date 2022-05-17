var crypto = require('crypto');

var primeLength = 256; // 素数p的长度
var generator = 5; // 素数a

// 创建客户端的DH实例
var client = crypto.createDiffieHellman(primeLength, generator);
// 产生公、私钥对，Ya = a^Xa mod p
var clientKey = client.generateKeys();
var clientPublicKey =client.getPublicKey()
// 创建服务端的DH实例，采用跟客户端相同的素数a、p
//console.log(client.getGenerator());
global_p=client.getPrime().toString('hex');
global_g=client.getGenerator().toString('hex');
console.log(global_p);
console.log(global_g);
global_p_buffer=Buffer.from(global_p,'hex');
global_g_buffer=Buffer.from(global_g,'hex');
var server = crypto.createDiffieHellman(global_p_buffer, global_g_buffer);
// 产生公、私钥对，Yb = a^Xb mod p
var serverKey = server.generateKeys();
var serverPublicKey = server.getPublicKey();
// 计算 Ka = Yb^Xa mod p
var clientSecret = client.computeSecret(serverPublicKey);
// 计算 Kb = Ya^Xb mod p
var serverSecret = server.computeSecret(clientPublicKey);

// 由于素数p是动态生成的，所以每次打印都不一样
// 但是 clientSecret === serverSecret
console.log(clientSecret.toString('hex'));
console.log(serverSecret.toString('hex'));

// An encrypt function cbc模式
// function encrypt(text,key) {
 
//     // Creating Cipheriv with its parameter
//     let cipher = crypto.createCipheriv(
//          'aes-256-cbc', Buffer.from(key), '1234567890123456');
    
//     // Updating text
//     let encrypted = cipher.update(text);
    
//     // Using concatenation
//     encrypted = Buffer.concat([encrypted, cipher.final()]);
    
//     // Returning iv and encrypted data
//     return encrypted.toString('hex');
//    }
// var c1=encrypt('hello',clientSecret);
// console.log(c1);
// function decrypt(text,key) {
//     // Creating Decipheriv with its parameter
//     let decipher = crypto.createDecipheriv(
//         'aes-256-cbc', Buffer.from(key), '1234567890123456');
    
//     // Updating text
//     let decrypted = decipher.update(text,'hex','utf8');
    
//     // Using concatenation
//     decrypted += decipher.final('utf8');
    
//     // Returning decrypted data
//     return decrypted;
// }
// var a1=decrypt(c1,serverSecret);
// console.log(a1);
// Demo implementation of using `aes-256-gcm` with node.js's `crypto` lib.
function encrypt(ALGO,text, key) {
    //The `iv` for a given key must be globally unique to prevent
      // against forgery attacks. `randomBytes` is convenient for
      // demonstration but a poor way to achieve this in practice.
      //
      // See: e.g. https://csrc.nist.gov/publications/detail/sp/800-38d/final
      const iv = new crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(ALGO, key, iv);
  
      // Hint: Larger inputs (it's GCM, after all!) should use the stream API
      let enc = cipher.update(text, 'utf8', 'base64');
      enc += cipher.final('base64');
      return [enc, iv, cipher.getAuthTag()];
}
function decrypt(ALGO,enc,key, iv, authTag) {
        const decipher = crypto.createDecipheriv(ALGO, key, iv);
        decipher.setAuthTag(authTag);
        let str = decipher.update(enc, 'base64', 'utf8');
        str += decipher.final('utf8');
        return str;
}
// 原来的代码
// const aes256gcm = (key) => {
//     const ALGO = 'aes-256-gcm';
  
//     // encrypt returns base64-encoded ciphertext
//     const encrypt = (str) => {
//       // The `iv` for a given key must be globally unique to prevent
//       // against forgery attacks. `randomBytes` is convenient for
//       // demonstration but a poor way to achieve this in practice.
//       //
//       // See: e.g. https://csrc.nist.gov/publications/detail/sp/800-38d/final
//       const iv = new crypto.randomBytes(12);
//       const cipher = crypto.createCipheriv(ALGO, key, iv);
  
//       // Hint: Larger inputs (it's GCM, after all!) should use the stream API
//       let enc = cipher.update(str, 'utf8', 'base64');
//       enc += cipher.final('base64');
//       return [enc, iv, cipher.getAuthTag()];
//     };
  
//     // decrypt decodes base64-encoded ciphertext into a utf8-encoded string
//     const decrypt = (enc, iv, authTag) => {
//       const decipher = crypto.createDecipheriv(ALGO, key, iv);
//       decipher.setAuthTag(authTag);
//       let str = decipher.update(enc, 'base64', 'utf8');
//       str += decipher.final('utf8');
//       return str;
//     };
  
//     return {
//       encrypt,
//       decrypt,
//     };
//   };
// const aesCipher=aes256gcm(clientSecret);
// const [encrypted,iv,authTag]=aesCipher.encrypt('你好');
// const decrypted=aesCipher.decrypt(encrypted,iv,authTag);
// console.log(encrypted);
// console.log(decrypted);
ALGO='aes-256-gcm';
const [encrypted,iv,authTag]=encrypt(ALGO,'你好',clientSecret);
var encryptedStr=encrypted.toString('hex');
const hash = crypto.createHash('sha256'); 
var encryptedStrHash=hash.update(encryptedStr, 'utf8').digest('hex');
console.log(encryptedStrHash);
const decrypted=decrypt(ALGO,encrypted,serverSecret,iv,authTag);
console.log(encrypted);
console.log(decrypted);