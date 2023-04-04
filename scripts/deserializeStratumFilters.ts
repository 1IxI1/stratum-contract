import { Address, toNano, beginCell } from 'ton-core';
import { StratumContract } from '../wrappers/StratumContract';
import { compile, NetworkProvider } from '@ton-community/blueprint';


export async function run(provider: NetworkProvider) {
    // IVE CHANGED THE CONTRACT. NEED REDEPLOY FIXME!!!
    const stratumAddress = Address.parse("EQBcVhuTGXAlDJuSFIz3fLl3EYIhRcIo-zWvIjBNBRLS6DSY");
    const stratumContract = provider.open(StratumContract.createFromAddress(stratumAddress));
    const ownerAddress = provider.sender().address
    if (ownerAddress === undefined) {
        throw new Error('No owner address');
    }

    console.log("ownerAddress", ownerAddress.hash.toString('hex'));

    
    const { filters } = await stratumContract.getStratumData();
    console.log(filters.keys());
    let res = filters.get(ownerAddress.hash);
    console.log(res);
}
