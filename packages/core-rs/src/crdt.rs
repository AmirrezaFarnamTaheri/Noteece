use yrs::updates::decoder::Decode;
use yrs::{Doc, GetString, ReadTxn, StateVector, Text, Transact, Update};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CrdtError {
    #[error("Yrs decode error: {0}")]
    DecodeError(String),
    #[error("Yrs update error: {0}")]
    UpdateError(String),
}

pub fn apply_update(doc: &mut Doc, update: &[u8]) -> Result<(), CrdtError> {
    let mut txn = doc.transact_mut();
    let update = Update::decode_v1(update).map_err(|e| CrdtError::DecodeError(e.to_string()))?;
    txn.apply_update(update);
    Ok(())
}

pub fn get_update(doc: &mut Doc, remote_sv: &[u8]) -> Result<Vec<u8>, CrdtError> {
    let txn = doc.transact();
    let sv = StateVector::decode_v1(remote_sv).map_err(|e| CrdtError::DecodeError(e.to_string()))?;
    Ok(txn.encode_diff_v1(&sv))
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
