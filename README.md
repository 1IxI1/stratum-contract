- **TEP**: [0](https://github.com/ton-blockchain/TEPs/pull/0)
- **title**: DNS Stratum Contract
- **status**: Draft
- **type**: Contract Interface
- **authors**: [Victor Syshchenko](https://github.com/1ixi1)
  (the idea)
- **created**: 19.01.2023 *(fill with current date)*
- **replaces**: -
- **replaced by**: -


# Summary

DNS Stratum Contract - это прослойка между пользователями и доменом,
дающая первым возможность управлять записями в домене путем отправки
сообщений с телом соответствующего формата не напрямую к домену, но
к прослойке, которая фильтрует сообщения с некоторыми параметрами
иперенаправляет их к домену.


# Motivation

Потенциал использования записей в TON DNS очень велик. Их можно
использовать не только для привязки кошелька или адреса в TON Storage, но
при желании и для установки личных данных, контактов и почти чего угодно.

Иногда какому-либо сервису нужна гарантия, что определенная запись
в домене будет неизменна на протяжении некоторого времени или же совсем.

Чтобы разработчики не придумывали различные новые контракты для этих
целей, нужно создать стандарт, который будет главным образом служить
моделью для **обнаружения** контрактов такого типа.


# Guide / Useful links
1. [Reference DNS Stratum smart contract]()
2. [Reference DNS smart contracts](https://github.com/ton-blockchain/dns-contract)
3. [Interaction with reference DNS Stratum contract example in Python]()



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
   * `2**64 - 1` if expiration time for editorship is not set.
   * `0` if address has no editorship on this category.
   * and timestamp of editorship expiration time otherwise.

   \
   When calling `editorship_expires_at(null(), 0)` the smart contract
   **should** return the hash part of the address, to wich the contract
   **may** transfer DNS item after the expiration of all editorship
   records.

2. `get_dns_item_address()` returns `slice dns_item_address` -
   an address of the DNS item on which the contract targets on.


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
