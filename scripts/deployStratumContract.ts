import { Address, toNano, beginCell } from 'ton-core';
import { StratumContract } from '../wrappers/StratumContract';
import { compile, NetworkProvider } from '@ton-community/blueprint';


const WALLET_CATEGORY = BigInt('0xe8d44050873dba865aa7c170ab4cce64d90839a34dcfd6cf71d14e0205443b1b');

export async function run(provider: NetworkProvider) {
    const dnsItemAddress = Address.parse('EQA0uuol5y2v3wlIbpb_u3QH1imNgVGUNIyljNRg8JS5NQhM');
    const editorAddress = Address.parse('EQBkb28fExJEllBL1lRBvA0Gd2RaOx5GCJbwopnxPlNiWkW9');
    const ownerAddress = provider.sender().address

    if (ownerAddress === undefined) {
        throw new Error('No owner address');
    }

    const now = Math.floor(Date.now() / 1000);
    const stratumContract = provider.open(StratumContract.createFromConfig({
                domain_address: dnsItemAddress,
                expiresAt: now + 60 * 15,
                filters: [
                    {
                        editor: editorAddress,
                        isWhitelist: true,
                        categories: [
                            { category: BigInt("111"), time: now + 60 * 10 },
                        ]
                    },
                    {
                        editor: ownerAddress,
                        isWhitelist: false,
                        categories: [
                            { category: BigInt("111"), time: now + 60 * 10 },
                            { category: WALLET_CATEGORY, time: now + 60 * 5 },
                        ]
                    }
                ],
                return_address: ownerAddress,
            }, await compile('StratumContract')));

    await stratumContract.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(stratumContract.address);

    // transfer domain to stratum
    await provider.sender().send({
        to: dnsItemAddress,
        value: toNano('0.075'),
        body: beginCell()
                .storeUint(0x5fcc3d14, 32)
                .storeUint(0, 64)
                .storeAddress(stratumContract.address)
                .storeAddress(null)
                .storeBit(false)
                .storeCoins(toNano('0.02'))
                .endCell()
    });

    setTimeout(async () => {
        console.log('Waiting for stratum to init...');
    }, 10000);

    // try to remove wallet record
    // (should fail with exit code 502)
    await provider.sender().send({
        to: stratumContract.address,
        value: toNano('0.05'),
        body: beginCell()
             .storeUint(0x4eb1f0f9, 32)
             .storeUint(0, 64)
             .storeUint(WALLET_CATEGORY, 256)
             .endCell() 
    });
}
