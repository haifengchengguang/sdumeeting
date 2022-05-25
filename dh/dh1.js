var crypto = require('crypto');
function diffieHellman_client_step1(client){    
    var clientKey = client.generateKeys();
    var clientPublicKey =client.getPublicKey();
    global_p=client.getPrime().toString('hex');
    //console.log(global_p);
    global_g=client.getGenerator().toString('hex');
    return new Array(global_p,global_g,clientPublicKey.toString('hex'));
    
}
function diffieHellman_client_step2(serverPublicKey){
    serverPublicKey_buffer=Buffer.from(serverPublicKey,'hex');
    var clientSecret = client.computeSecret(serverPublicKey_buffer);
    return clientSecret.toString('hex');
}
function diffieHellman_server(global_p,global_g,clientPublicKey){
    global_p_buffer=Buffer.from(global_p,'hex');
    global_g_buffer=Buffer.from(global_g,'hex');
    clientPublicKey_buffer=Buffer.from(clientPublicKey,'hex');
    var server = crypto.createDiffieHellman(global_p_buffer, global_g_buffer);
    var serverKey = server.generateKeys();
    var serverPublicKey = server.getPublicKey();
    var serverSecret = server.computeSecret(clientPublicKey_buffer);
    return new Array(serverSecret.toString('hex'),serverPublicKey.toString('hex'));

}
var primeLength = 256; // 素数p的长度
var generator = 5; // 素数a     
var client = crypto.createDiffieHellman(primeLength, generator);

pgArray=diffieHellman_client_step1(client);
//console.log(pgArray[0]);
//client向server发送pgArray
serverArray=diffieHellman_server(pgArray[0],pgArray[1],pgArray[2]);
serverSecretKey=serverArray[0];
//server向client发送serverSecretKey
clientSecretKey=diffieHellman_client_step2(serverArray[1]);
console.log(clientSecretKey);
console.log(serverSecretKey);


