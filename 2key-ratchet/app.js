import * as randomstring from "randomstring";
import * as DKeyRatchet from "@vhop/2key-ratchet";
import { Convert } from "pvtsutils";
import React from "react";

export default function Benchmark() {
  const [outputString, setOutputString] = React.useState();

  const randomStrings = [];
  for (let i = 0; i < 100; i++) {
    randomStrings.push(randomstring.generate(15));
  }

  const randomStrings100 = [];
  for (let i = 0; i < 100; i++) {
    randomStrings100.push(randomstring.generate(100));
  }

  const randomStrings1000 = [];
  for (let i = 0; i < 100; i++) {
    randomStrings1000.push(randomstring.generate(1000));
  }

  const randomStrings1000x10 = [];
  for (let i = 0; i < 100; i++) {
    randomStrings1000x10.push(randomstring.generate(1000 * 10));
  }

  const randomStrings1000x50 = [];
  for (let i = 0; i < 100; i++) {
    randomStrings1000x50.push(randomstring.generate(1000 * 50));
  }

  const benchmark = async () => {
    setOutputString("Loading");
    const AliceID = await DKeyRatchet.Identity.create("16453", 1);

    // Create PreKeyBundle
    const AlicePreKeyBundle = new DKeyRatchet.PreKeyBundleProtocol();
    await AlicePreKeyBundle.identity.fill(AliceID);
    AlicePreKeyBundle.registrationId = AliceID.id;
    // Add info about signed PreKey
    const preKey = AliceID.signedPreKeys[0];
    AlicePreKeyBundle.preKeySigned.id = 0;
    AlicePreKeyBundle.preKeySigned.key = preKey.publicKey;
    await AlicePreKeyBundle.preKeySigned.sign(AliceID.signingKey.privateKey);
    // Convert proto to bytes
    const AlicePreKeyBundleProto = await AlicePreKeyBundle.exportProto();
    console.log("Alice's bundle: ", Convert.ToHex(AlicePreKeyBundleProto));

    const BobID = await DKeyRatchet.Identity.create("0", 1);
    // Parse Alice's bundle
    const bundle = await DKeyRatchet.PreKeyBundleProtocol.importProto(
      AlicePreKeyBundleProto
    );
    // Create Bob's cipher
    const BobCipher = await DKeyRatchet.AsymmetricRatchet.create(BobID, bundle);

    const BobMessageProto = await BobCipher.encrypt(
      Convert.FromUtf8String(randomStrings[0])
    );
    const BobMessage = await BobMessageProto.exportProto();

    // Creat Alice's cipher for Bob's message
    const proto = await DKeyRatchet.PreKeyMessageProtocol.importProto(
      BobMessage
    );
    const AliceCipher = await DKeyRatchet.AsymmetricRatchet.create(
      AliceID,
      proto
    );

    await AliceCipher.decrypt(proto.signedMessage);

    let prevDate = Date.now();

    let tmpOutputString = "";

    for (const randMsg of randomStrings) {
      const BobMessageProto = await BobCipher.encrypt(
        Convert.FromUtf8String(randMsg)
      );
      const BobMessage = await BobMessageProto.exportProto();

      const msgProto = await DKeyRatchet.MessageSignedProtocol.importProto(
        BobMessage
      );
      const msgBytes = await AliceCipher.decrypt(msgProto);

      //console.log(Convert.ToUtf8String(msgBytes));
    }

    tmpOutputString =
      tmpOutputString +
      "|" +
      "1000 msgs 15 byte per msg " +
      (Date.now() - prevDate);

    prevDate = Date.now();

    for await (const randMsg of randomStrings100) {
      const BobMessageProto = await BobCipher.encrypt(
        Convert.FromUtf8String(randMsg)
      );
      const BobMessage = await BobMessageProto.exportProto();

      const msgProto = await DKeyRatchet.MessageSignedProtocol.importProto(
        BobMessage
      );
      const msgBytes = await AliceCipher.decrypt(msgProto);

      //console.log(Convert.ToUtf8String(msgBytes));
    }

    tmpOutputString =
      tmpOutputString +
      "|" +
      "1000 msgs 100 byte per msg " +
      (Date.now() - prevDate);

    prevDate = Date.now();

    for await (const randMsg of randomStrings1000) {
      const BobMessageProto = await BobCipher.encrypt(
        Convert.FromUtf8String(randMsg)
      );
      const BobMessage = await BobMessageProto.exportProto();

      const msgProto = await DKeyRatchet.MessageSignedProtocol.importProto(
        BobMessage
      );
      const msgBytes = await AliceCipher.decrypt(msgProto);

      //console.log(Convert.ToUtf8String(msgBytes));
    }

    tmpOutputString =
      tmpOutputString +
      "|" +
      "1000 msgs 1000 byte per msg " +
      (Date.now() - prevDate);

    prevDate = Date.now();

    for await (const randMsg of randomStrings1000x10) {
      const BobMessageProto = await BobCipher.encrypt(
        Convert.FromUtf8String(randMsg)
      );
      const BobMessage = await BobMessageProto.exportProto();

      const msgProto = await DKeyRatchet.MessageSignedProtocol.importProto(
        BobMessage
      );
      const msgBytes = await AliceCipher.decrypt(msgProto);

      //console.log(Convert.ToUtf8String(msgBytes));
    }

    tmpOutputString =
      tmpOutputString +
      "|" +
      "1000 msgs 1000*10 byte per msg " +
      (Date.now() - prevDate);

    prevDate = Date.now();

    for await (const randMsg of randomStrings1000x50) {
      const BobMessageProto = await BobCipher.encrypt(
        Convert.FromUtf8String(randMsg)
      );
      const BobMessage = await BobMessageProto.exportProto();

      const msgProto = await DKeyRatchet.MessageSignedProtocol.importProto(
        BobMessage
      );
      const msgBytes = await AliceCipher.decrypt(msgProto);

      //console.log(Convert.ToUtf8String(msgBytes));
    }

    tmpOutputString =
      tmpOutputString +
      "|" +
      "100 msgs 1000*50 byte per msg " +
      (Date.now() - prevDate);
    setOutputString(tmpOutputString);
  };

  return (
    <div>
      <button onClick={benchmark}> Benchmark </button>
      <span>{outputString}</span>
    </div>
  );
}
