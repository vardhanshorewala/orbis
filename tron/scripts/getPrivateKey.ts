import { mnemonicToPrivateKey } from "@ton/crypto";

(async () => {
  const mnemonics = "broccoli loan catalog regular kiwi plunge fatigue supply debris bridge soap evoke uncle undo vital luxury salt wagon shy pink bulk purpose unique castle".split(" ");
  
  const keyPair = await mnemonicToPrivateKey(mnemonics);
  
  console.log('🔑 Private Key (hex):', keyPair.secretKey.toString('hex'));
  console.log('🔑 Private Key (base64):', keyPair.secretKey.toString('base64'));
  console.log('🗝️  Public Key (hex):', keyPair.publicKey.toString('hex'));
  console.log('🗝️  Public Key (base64):', keyPair.publicKey.toString('base64'));
  
  console.log('\n⚠️  WARNING: Never share your private key! Keep it secure!');
})(); 