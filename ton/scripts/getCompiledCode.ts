import { compile } from '@ton/blueprint';

/**
 * Script to compile TON contracts and output base64 encoded code
 * Use this to get the contract code for environment configuration
 */
export async function run() {
    console.log('🔨 Compiling TON contracts...\n');

    try {
        // Compile source escrow
        console.log('📦 Compiling TonSourceEscrow...');
        const sourceCode = await compile('TonSourceEscrow');

        const sourceBase64 = sourceCode.toBoc().toString('base64');
        console.log('✅ TonSourceEscrow compiled!');
        console.log('   Add to .env:');
        console.log(`   TON_SOURCE_ESCROW_TEMPLATE=${sourceBase64}\n`);

        // Compile destination escrow
        console.log('📦 Compiling TonDestinationEscrow...');
        const destCode = await compile('TonDestinationEscrow');
        const destBase64 = destCode.toBoc().toString('base64');
        console.log('✅ TonDestinationEscrow compiled!');
        console.log('   Add to .env:');
        console.log(`   TON_DESTINATION_ESCROW_TEMPLATE=${destBase64}\n`);

        console.log('🎉 Compilation complete!');
        console.log('\n📝 Next steps:');
        console.log('1. Copy the above base64 strings to your resolver/.env file');
        console.log('2. Make sure your TON wallet has funds for deployment');
        console.log('3. Run the resolver with: npm run dev -- start');

    } catch (error) {
        console.error('❌ Compilation failed:', error);
        process.exit(1);
    }
}