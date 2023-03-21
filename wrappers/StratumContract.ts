import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, Dictionary, DictionaryValue, TupleBuilder } from 'ton-core';

// FiltersDict: <editor: Address -> PersonalFilter: Cell>
//    PersonalFilter: 
//      isWhitelist: Bool
//      filters: FilterCategoriesDict FilterCategoriesDict: <category: Uint256 -> time: Uint64>

export type FilterCategory = {
    category: bigint,
    time: number;
};

export type Filter = {
    editor: Address;
    isWhitelist: boolean;
    categories: FilterCategory[];
}

export type StratumContractConfig = {
    domain_address: Address;
    expiresAt: number;
    return_address: Address;
    filters: Filter[];
};

export type CategoryValue = {
    time: number;
};

export const CategoryValues: DictionaryValue<CategoryValue> = {
    serialize: (src, builder) => {
        builder.storeUint(src.time, 64);
    },
    parse: (src) => {
        return {
            time: src.loadUint(64)
        };
    }
};

export type FilterValue = {
    isWhitelist: boolean;
    categories: Dictionary<bigint, CategoryValue>;
};

export const FilterValues: DictionaryValue<FilterValue> = {
    serialize: (src, builder) => {
        builder.storeBit(src.isWhitelist);
        builder.storeDict(src.categories);
    },
    parse: (src) => {
        return {
            isWhitelist: src.loadBit(),
            categories: src.loadDict(Dictionary.Keys.BigUint(256), CategoryValues)
        };
    }
};

export function filtersToDict(filters: Filter[]): Dictionary<Buffer, FilterValue> {
    const result = Dictionary.empty(Dictionary.Keys.Buffer(32), FilterValues);
    for (const filter of filters) {
        const categories = Dictionary.empty(Dictionary.Keys.BigUint(256), CategoryValues);
        for (const category of filter.categories) {
            categories.set(category.category, { time: category.time });
        }
        result.set(filter.editor.hash, { isWhitelist: filter.isWhitelist, categories });
    }
    return result;
}

export function stratumContractConfigToCell(config: StratumContractConfig): Cell {
    const filters = filtersToDict(config.filters);
    return beginCell()
        .storeBit(false)  // init?
        .storeAddress(config.domain_address)
        .storeUint(config.expiresAt, 64)
        .storeAddress(config.return_address)
        .storeDict(filters)
      .endCell();
}

export class StratumContract implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new StratumContract(address);
    }

    static createFromConfig(config: StratumContractConfig, code: Cell, workchain = 0) {
        const data = stratumContractConfigToCell(config);
        const init = { code, data };
        return new StratumContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    async getEditorShipExpiration(provider: ContractProvider, editor: Address, record: bigint) {
        const params = new TupleBuilder()
        params.writeAddress(editor)
        params.writeNumber(record)

        const { stack } = await provider.get('editorship_expires_at', params.build());
        return stack.readNumber();
    }

    async getDnsItemAddress(provider: ContractProvider) {
        const { stack } = await provider.get('get_dns_item_address', []);
        return stack.readAddress();
    }

    async getExpirationData(provider: ContractProvider) {
        const { stack } = await provider.get('get_expiration_data', []);
        return {
            expiresAt: stack.readNumber(),
            returnAddress: stack.readAddress()
        };
    }

    async getStratumData(provider: ContractProvider) {
        const { stack } = await provider.get('get_stratum_data', []);
        return {
            init: stack.readBoolean(),
            domainAddress: stack.readAddress(),
            expiresAt: stack.readNumber(),
            returnAddress: stack.readAddress(),
            filters: Dictionary.load(Dictionary.Keys.Buffer(32), FilterValues, stack.readCell())
        };
    }
}
