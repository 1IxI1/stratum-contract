import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, Dictionary } from 'ton-core';

export type DNSItemConfig = {
    owner: Address;
};


//
//  Storage
//
//  uint256 index
//  MsgAddressInt collection_address
//  MsgAddressInt owner_address
//  cell content
//  cell domain - e.g contains "alice" (without ending \0) for "alice.ton" domain
//  cell auction - auction info
//  int last_fill_up_time
export function dnsItemConfigToCell(config: DNSItemConfig): Cell {
    const content = beginCell()
                        .storeUint(0, 8)
                        .storeDict(Dictionary.empty(
                                Dictionary.Keys.Int(256)))
    return beginCell()
        .storeUint(0, 256)
        .storeAddress(null)
        .storeAddress(config.owner)
        .storeRef(content)
        .storeRef(beginCell().storeBuffer(Buffer.from('alice')))
        .storeBit(false)  // load_dict() -> null()
        .storeInt(Math.ceil(Date.now() / 1000), 64)
        .endCell();
}

export class DNSItemContract implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new DNSItemContract(address);
    }

    static createFromConfig(config: DNSItemConfig, workchain = 0) {
        const data = dnsItemConfigToCell(config);
        const code = Cell.fromBoc(Buffer.from('B5EE9C7241022B010006AB000114FF00F4A413F4BCF2C80B0102016202030202CC0405020120212202012006070201481B1C0201200809020158191A0201200A0B000D470C8CB01C9D0801F73E09DBC400B434C0C05C6C2497C1383E903E900C7E800C5C75C87E800C7E800C3C0289ECE39497C15B088D148CB1C17CB865407E90350C1B5C3232C1FD00327E08E08418B93CC428608209E3402A4108308324CC200337A082024EA02082024B1C162A20032A41287E08C0683C00911DFC02440D7E08FC02F814D6600C00113E910C1C2EBCB8536004FAC70518B08E34109B5F0BFA40307020F8256D8040708010C8CB055007CF165005FA0215CB6A12CB1FCB3F226EB39458CF17019132E201C901FB00E029C70091709509D31F50AAE221F008F82321BC24C0008E9E343A3A3B8E1636363737375135C705F2E196102510241023F823F00BE30EE0310DD33F256EB31FB0E30F0D0E0F1001FC302680698064A98452B0BEF2E19782103B9ACA0052A0A15270BC993682103B9ACA0019A193390805E220C2008E328210557CEA20F82510396D71708010C8CB055007CF165005FA0215CB6A12CB1FCB3F226EB39458CF17019132E201C901FB00923036E2810E1023F823A1A120C2009313A0029130E24474F0091024F8231100D2343653CDA182103B9ACA005210A15270BC993682103B9ACA0016A1923005E220C2008E378210370FEC516D72295134544743708010C8CB055007CF165005FA0215CB6A12CB1FCB3F226EB39458CF17019132E201C901FB001CA10B9130E26D5477655477632EF00B0200046C2104CC82105FCC3D145220BA8E9731373B5372C705F2E191109A104910384706401504DB3CE082101A0B9D515220BA8E195B32353537375135C705F2E19A03D4304015045033F823F00BE02182104EB1F0F9BAE3023B20821044BEAE41BAE302382782104ED14B65BA151213140004F00B00885B363638385147C705F2E19B04D3FF20D74AC20007D0D30701C000F2E19CF404300798D43040168307F417983050058307F45B30E270C8CB07F400C910354014F823F00B029C30363A246EF2E19D8050F833D0F4043052408307F40E6FA1F2E19FD30721C00022C001B1F2E1A021C0008E9324109B1068517A10571046105C43144CDDDB3C9630103A395F07E201C001915BE30D151601A2E3025F0432353582102FCB26A2BA8E3A7082108B77173504C8CBFF5005CF161443308040708010C8CB055007CF165005FA0215CB6A12CB1FCB3F226EB39458CF17019132E201C901FB00E05F04840FF2F01801F03502FA4021F001FA40D20031FA0082103B9ACA001DA121945314A0A1DE22D70B01C300209205A19135E220C2FFF2E192218E3E821005138D91C8500BCF16500DCF1671244B145448C0708010C8CB055007CF165005FA0215CB6A12CB1FCB3F226EB39458CF17019132E201C901FB00106994102C395BE201170064708210370FEC51586D8100A0708010C8CB055007CF165005FA0215CB6A12CB1FCB3F226EB39458CF17019132E201C901FB00008A8E3528F0018210D53276DB103946096D71708010C8CB055007CF165005FA0215CB6A12CB1FCB3F226EB39458CF17019132E201C901FB0093383430E21045103412F823F00B00FC37F8235006A18209E28500BC066E16B0F2E19E23D0D749F823F0075290BEF2E1975178A182103B9ACA00A120C2008E32102782104ED14B6558076D72708010C8CB055007CF165005FA0215CB6A12CB1FCB3F226EB39458CF17019132E201C901FB0093303535E2F8238208093A80A0F0024477F0091045103412F823F00B0093083001258C2040FA201938083001658C20407D200CB8083001A58C204064200A38083001E58C20404B2007B8083002258C204032200538083002650C20191EB83002A4E00C9D781E9C600069006AC0BC018060840EE6B2802A0060840EE6B2802A00A08418B93CC428608209E3402A410830856456F81B04A5A9D6A0192A4139200201201D1E0201201F200021081BA50C1B5C0838343E903E8034CFCC200017321400F3C5807E80B2CFF26000513B513434FFFE900835D2708027DFC07E9035353D0134CFCC0415C415B80C1C1B5B5B5B490415C415A0002B01B232FFD40173C59400F3C5B3333D0032CFF27B5520020120232402012027280013BBB39F00A175F07F008802027425260010A874F00A10475F07000CA959F00A6C71000DB8FCFF00A5F038020120292A0013B64A5E014204EBE0FA1000C7B461843AE9240F152118001E5C08DE014206EBE0FA1A60E038001E5C339E8086007AE140F8001E5C33B84111C466105E033E04883DCB11FB64DDC4964AD1BA06B879240DC23572F37CC5CAAAB143A2FFFBC4180012660F003C003060FE81EDF4260F0030BC2F75A8', 'hex'))[0]
        const init = { code, data };
        return new DNSItemContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
