use yrs::updates::decoder::Decode;
use yrs::{Doc, GetString, ReadTxn, StateVector, Text, Transact, Update};

pub fn apply_update(doc: &mut Doc, update: &[u8]) {
    let mut txn = doc.transact_mut();
    txn.apply_update(Update::decode_v1(update).unwrap());
}

pub fn get_update(doc: &mut Doc, remote_sv: &[u8]) -> Vec<u8> {
    let txn = doc.transact();

    txn.encode_diff_v1(&StateVector::decode_v1(remote_sv).unwrap())
}

pub fn get_text(doc: &Doc) -> String {
    let text = doc.get_or_insert_text("content");
    let txn = doc.transact();
    text.get_string(&txn)
}

pub fn insert_text(doc: &mut Doc, index: u32, content: &str) {
    let text = doc.get_or_insert_text("content");
    let mut txn = doc.transact_mut();
    text.insert(&mut txn, index, content);
}
