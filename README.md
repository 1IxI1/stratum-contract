- **TEP**: [0](https://github.com/ton-blockchain/TEPs/pull/0)
- **title**: DNS Stratum Contract
- **status**: Draft
- **type**: Contract Interface
- **authors**: [Victor Syshchenko](https://github.com/1ixi1)
  (the idea)
- **created**: 21.03.2023 *(fill with current date)*
- **replaces**: -
- **replaced by**: -


# Summary

DNS Stratum Contract is a layer between users and a domain, allowing users
to manage records in the domain by sending messages with the body of the
corresponding format not directly to the domain, but to the layer that
filters the editing of certain records and forwards messages to the
domain.


# Motivation

The potential use of records in TON DNS is very significant. They can be
used not only to link a wallet or address in TON Storage, but also to
establish personal data, contacts, and almost anything else, if desired.

Sometimes, a certain service needs a guarantee that a particular record in
the domain will remain unchanged for a certain period of time, or even
permanently.

To prevent developers from coming up with various new contracts for these
purposes, a standard needs to be created that will primarily serve as
a model for discovering contracts of this type.


# Guide / Useful links

1. [Reference DNS Stratum smart contract](contracts/stratum_contract.fc)
2. [Reference TON DNS smart contracts](https://github.com/ton-blockchain/dns-contract)


# Specification

### Internal messages
When receiving an internal message with any specified op to change
the DNS item's record, a smart contract that implements the DNS Stratum
standart **should**:
   * Reject it if the sender does not have editorship for this category
   or the expiration time passed.
   * Otherwise should resend it to the DNS Item.

### Get-methods
A smart contract **must** contain:
1. `editorship_expires_at(slice editor_address, int category)`
   returns `int`:
   * `0` if address has no editorship on this category.
   * and timestamp of editorship/stratum expiration time otherwise.

2. `get_dns_item_address()` returns `slice dns_item_address` -
   address of the dns item to which stratum filters messages.

3. `get_expiration_data()` returns `(int expiration_time, slice return_address)`
   `expiration_time` - timestamp of the time after which the contract
   may self-destruct after any run and transfer the dns item to
   the address `return_address`.


# Drawbacks

None


# Prior art
None


# Rationale and alternatives

Why?

# Unresolved questions

None for now


# Future possibilities
None for now
