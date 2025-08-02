import TonConnect from '@tonconnect/sdk';

(async () => {
    try {
        const connector = new TonConnect({
            manifestUrl: 'https://ton-connect.github.io/demo-dapp-with-react-ui/tonconnect-manifest.json'
        });

        console.log('🔄 Attempting to disconnect from TON Connect...');
        
        await connector.disconnect(); // clears session
        
        console.log('✅ TON Connect session cleared successfully!');
        console.log('🔄 All wallet connections have been disconnected');
        
    } catch (error) {
        console.log(`❌ Error clearing session: ${error}`);
        console.log('ℹ️  Session may already be cleared or not exist');
    }
})(); 