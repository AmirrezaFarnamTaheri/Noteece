use core_rs::crdt::{apply_update, get_text, get_update, insert_text};
use yrs::updates::encoder::Encode;
use yrs::{Doc, ReadTxn, Transact};

#[test]
fn test_crdt() {
    let mut doc1 = Doc::new();
    insert_text(&mut doc1, 0, "hello");
    let sv1 = doc1.transact().state_vector().encode_v1();
    let _update1 = get_update(&mut doc1, &sv1).unwrap();

    let mut doc2 = Doc::new();
    let sv2 = doc2.transact().state_vector().encode_v1();
    let update_for_doc2 = get_update(&mut doc1, &sv2).unwrap();
    apply_update(&mut doc2, &update_for_doc2).unwrap();
    assert_eq!(get_text(&doc2), "hello");

    insert_text(&mut doc2, 5, " world");
    let update2 = get_update(&mut doc2, &sv1).unwrap();

    apply_update(&mut doc1, &update2).unwrap();
    assert_eq!(get_text(&doc1), "hello world");
}
