import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { beginCell, Cell, toNano, fromNano, Address, Dictionary, TupleReader } from 'ton-core';
import { StratumContract } from '../wrappers/StratumContract';
import { DNSItemContract } from '../wrappers/DNSItem';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';


function createEditRecordBody(record: bigint) {
    return beginCell()
             .storeUint(0x4eb1f0f9, 32)
             .storeUint(0, 64)
             .storeUint(record, 256)
           .endCell()
}

describe('StratumContract', () => {
    let stratumContractCode: Cell;
    let stratumContract: SandboxContract<StratumContract>;
    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let editorOne: SandboxContract<TreasuryContract>;
    let editorMany: SandboxContract<TreasuryContract>;
    let dnsItem: SandboxContract<DNSItemContract>;

    beforeAll(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = 100;

        owner = await blockchain.treasury('owner');
        editorOne = await blockchain.treasury('editorOne');
        editorMany = await blockchain.treasury('editorMany');

        stratumContractCode = await compile('StratumContract');
    });

    it('should deploy domain and stratum', async () => {
        dnsItem = blockchain.openContract(
            DNSItemContract.createFromConfig(
                {owner: owner.address}));

        stratumContract = blockchain.openContract(
            StratumContract.createFromConfig({
                domain_address: dnsItem.address,
                expiresAt: 500,
                filters: [
                    {
                        editor: editorOne.address,
                        isWhitelist: true,
                        categories: [
                            { category: BigInt("111"), time: 200 },
                        ]
                    },
                    {
                        editor: editorMany.address,
                        isWhitelist: false,
                        categories: [
                            { category: BigInt("111"), time: 300 },
                        ]
                    }
                ],
                return_address: owner.address,
            }, stratumContractCode)
        );

        const deployStratumResult = await stratumContract.sendDeploy(owner.getSender(), toNano('0.05'));
        const deployDomainResult = await dnsItem.sendDeploy(owner.getSender(), toNano('1.5'));

        expect(deployStratumResult.transactions).toHaveTransaction({
            from: owner.address,
            to: stratumContract.address,
            deploy: true,
        });
        expect(deployDomainResult.transactions).toHaveTransaction({
            from: owner.address,
            to: dnsItem.address,
            deploy: true,
            success: true,
        });
        expect(deployStratumResult.transactions).not.toHaveTransaction({
            from: stratumContract.address
        });
    });
    it('should throw 500 on trying edit before init', async () => {
        const sendResult = await editorOne.send({
            to: stratumContract.address,
            value: toNano('0.05'),
            body: createEditRecordBody(BigInt('1')),
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: editorOne.address,
            to: stratumContract.address,
            success: false,
            exitCode: 500
        });
    });
    it('should initialize after receiving domain', async () => {
        console.log('Domain addr:', dnsItem.address);
        const sendResult = await owner.send({
            to: dnsItem.address,
            value: toNano('0.15'),
            body: beginCell()
                .storeUint(0x5fcc3d14, 32)
                .storeUint(0, 64)
                .storeAddress(stratumContract.address)
                .storeAddress(null)
                .storeBit(false)
                .storeCoins(toNano('0.05'))
                .endCell()
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: dnsItem.address,
            to: stratumContract.address,
            success: true,
        });
        const stratumData = await stratumContract.getStratumData();
        expect(stratumData.init).toEqual(true);
    });
    it('should allow by whitelist', async () => {
        let expiration = await stratumContract.getEditorShipExpiration(editorOne.address, BigInt('111'))
        expect(expiration).toEqual(200);

        const sendResult = await editorOne.send({
            to: stratumContract.address,
            value: toNano('0.05'),
            body: createEditRecordBody(BigInt('111')),
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: editorOne.address,
            to: stratumContract.address,
            success: true,
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: stratumContract.address,
            to: dnsItem.address,
            body: createEditRecordBody(BigInt('111')),
            success: true,
        });
    });
    it('should deny non-whitelist edits to the same editor', async () => {
        let expiration = await stratumContract.getEditorShipExpiration(editorOne.address, BigInt('222'))
        expect(expiration).toEqual(0);

        const sendResult = await editorOne.send({
            to: stratumContract.address,
            value: toNano('0.05'),
            body: createEditRecordBody(BigInt('222')),
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: editorOne.address,
            to: stratumContract.address,
            success: false,
            exitCode: 502
        });
    });
    it('should deny everything after whitelist expire date', async () => {
        blockchain.now = 201;
        console.log('Set time to 201 (> 200)');

        let expiration = await stratumContract.getEditorShipExpiration(editorOne.address, BigInt('111'))
        expect(expiration).toEqual(0);

        let sendResult = await editorOne.send({
            to: stratumContract.address,
            value: toNano('0.05'),
            body: createEditRecordBody(BigInt('111')),
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: editorOne.address,
            to: stratumContract.address,
            success: false,
            exitCode: 502
        });
        sendResult = await editorOne.send({
            to: stratumContract.address,
            value: toNano('0.05'),
            body: createEditRecordBody(BigInt('222')),
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: editorOne.address,
            to: stratumContract.address,
            success: false,
            exitCode: 502
        });
    });
    it('should deny non-listed user to do smth', async () => {
        const randomUser = await blockchain.treasury('randomUser');

        let expiration = await stratumContract.getEditorShipExpiration(randomUser.address, BigInt('111'))
        expect(expiration).toEqual(0);

        const sendResult1 = await randomUser.send({
            to: stratumContract.address,
            value: toNano('0.05'),
            body: createEditRecordBody(BigInt('111')),
        });
        const sendResult2 = await randomUser.send({
            to: stratumContract.address,
            value: toNano('0.05'),
            body: createEditRecordBody(BigInt('222')),
        });
        const sendResult3 = await randomUser.send({
            to: stratumContract.address,
            value: toNano('0.05'),
            body: createEditRecordBody(BigInt('333')),
        });
        for (let sendResult of [sendResult1, sendResult2, sendResult3]) {
            expect(sendResult.transactions).toHaveTransaction({
                from: randomUser.address,
                to: stratumContract.address,
                success: false,
                exitCode: 502
            });
        }
    });
    it('should resend empty message to the domain', async () => {
        const sendResult = await editorOne.send({
            to: stratumContract.address,
            value: toNano('0.05'),
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: stratumContract.address,
            to: dnsItem.address,
            success: true,
        });
    });
    it('should deny other editor by blacklist', async () => {
        let expiration = await stratumContract.getEditorShipExpiration(editorMany.address, BigInt('111'))
        expect(expiration).toEqual(0);

        const sendResult = await editorMany.send({
            to: stratumContract.address,
            value: toNano('0.05'),
            body: createEditRecordBody(BigInt('111')),
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: editorMany.address,
            to: stratumContract.address,
            success: false,
            exitCode: 502
        });
    });
    it('should allow same editor to edit other records', async () => {
        let expiration = await stratumContract.getEditorShipExpiration(editorMany.address, BigInt('222'))
        expect(expiration).toEqual(500);

        const sendResult = await editorMany.send({
            to: stratumContract.address,
            value: toNano('0.05'),
            body: createEditRecordBody(BigInt('222')),
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: editorMany.address,
            to: stratumContract.address,
            success: true,
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: stratumContract.address,
            to: dnsItem.address,
            body: createEditRecordBody(BigInt('222')),
            success: true,
        });
    });
    it("should allow same editor to edit blacklist record after it's expiration", async () => {
        blockchain.now = 301;
        console.log('Set time to 301 (> 300)');

        let expiration = await stratumContract.getEditorShipExpiration(editorMany.address, BigInt('111'))
        expect(expiration).toEqual(500);

        expiration = await stratumContract.getEditorShipExpiration(editorMany.address, BigInt('222'))
        expect(expiration).toEqual(500);

        const sendResult = await editorMany.send({
            to: stratumContract.address,
            value: toNano('0.05'),
            body: createEditRecordBody(BigInt('111')),
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: editorMany.address,
            to: stratumContract.address,
            success: true,
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: stratumContract.address,
            to: dnsItem.address,
            body: createEditRecordBody(BigInt('111')),
            success: true,
        });
    });
    it('should self-destruct and transfer domain after expiration', async () => {
        blockchain.now = 501;
        console.log('Set time to 501 (> 500)');

        const sendResult = await editorOne.send({
            to: stratumContract.address,
            value: toNano('0.05'),
            body: createEditRecordBody(BigInt('123')),
        });
        expect(sendResult.transactions).toHaveTransaction({
            from: editorOne.address,
            to: stratumContract.address,
            destroyed: true,
            success: true,
        });
        expect(sendResult.transactions).toHaveTransaction({
            // transfer request
            from: stratumContract.address,
            to: dnsItem.address,
            success: true,
        });
        expect(sendResult.transactions).toHaveTransaction({
            // transfer ownership assigned
            from: dnsItem.address,
            to: owner.address,
            success: true,
        });
    });
});
