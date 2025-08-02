import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV4 } from "@ton/ton";

(async () => {
  const mnemonics = "broccoli loan catalog regular kiwi plunge fatigue supply debris bridge soap evoke uncle undo vital luxury salt wagon shy pink bulk purpose unique castle".split(" ");
  
  const keyPair = await mnemonicToPrivateKey(mnemonics);
  
  const workchain = 0;
  const wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
  
  console.log('📱 WALLET INFORMATION');
  console.log('=' .repeat(50));
  console.log('📍 Wallet Address:', wallet.address.toString());
  console.log('📍 Raw Address:', wallet.address.toRawString());
  console.log('🌐 Workchain:', workchain);
  console.log('');
  
  console.log('🔐 KEY INFORMATION');
  console.log('=' .repeat(50));
  console.log('🔑 Private Key (hex):', keyPair.secretKey.toString('hex'));
  console.log('🔑 Private Key (base64):', keyPair.secretKey.toString('base64'));
  console.log('🗝️  Public Key (hex):', keyPair.publicKey.toString('hex'));
  console.log('🗝️  Public Key (base64):', keyPair.publicKey.toString('base64'));
  console.log('');
  
  console.log('🎯 MNEMONIC PHRASE');
  console.log('=' .repeat(50));
  console.log('📝 Mnemonic:', mnemonics.join(' '));
  console.log('');
  
  console.log('⚠️  SECURITY WARNING');
  console.log('=' .repeat(50));
  console.log('🚨 NEVER share your private key or mnemonic!');
  console.log('🚨 Anyone with these can control your wallet!');
  console.log('🚨 Only use this for testing on testnet!');
})(); 