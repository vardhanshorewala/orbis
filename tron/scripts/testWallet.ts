import { TonClient, WalletContractV4, internal } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";

// Using free testnet endpoint (no API key required)
const client = new TonClient({
  endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC'
});

(async () => {
  const mnemonics = "broccoli loan catalog regular kiwi plunge fatigue supply debris bridge soap evoke uncle undo vital luxury salt wagon shy pink bulk purpose unique castle".split(" ");
  const keyPair = await mnemonicToPrivateKey(mnemonics);

  const workchain = 0;
  const wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
  const contract = client.open(wallet);

  const seqno = await contract.getSeqno();

  const transfer = await wallet.createTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [internal({
      to: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N', // destination address
      value: '0.05', // 0.05 TON
      body: 'Test transfer from script',
    })],
  });

  const bocBase64 = transfer.toBoc().toString('base64');
  console.log('\n📦 BOC (base64):\n');
  console.log(bocBase64);
  console.log('\n📤 curl to send:\n');
  console.log(`curl -X POST https://testnet.toncenter.com/api/v2/sendBoc \\
  -H "Content-Type: application/json" \\
  -d '{"boc": "${bocBase64}"}'`);
})(); 