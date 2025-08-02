import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    try {
        // Get the connector from the provider
        const connector = (provider as any).connector;
        
        if (connector && connector.disconnect) {
            await connector.disconnect(); // clears session
            ui.write('✅ Wallet disconnected successfully!');
            ui.write('🔄 Session cleared');
        } else {
            ui.write('ℹ️  No active wallet connection found');
        }
    } catch (error) {
        ui.write(`❌ Error disconnecting: ${error}`);
    }
} 