use core_rs::db;
use core_rs::form::{self, FormField, FormFieldType};
use core_rs::space;
use rusqlite::Connection;
use tempfile::tempdir;

fn setup_db() -> (Connection, tempfile::TempDir) {
    let temp_dir = tempdir().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    db::migrate(&mut conn).unwrap();
    (conn, temp_dir)
}

#[test]
fn test_form_template_crud() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Form Space").unwrap();
    let space_str = space_id.to_string();

    let fields = vec![
        FormField {
            name: "field1".to_string(),
            label: "Field 1".to_string(),
            field_type: FormFieldType::Text,
            default_value: Some("default".to_string()),
        },
        FormField {
            name: "field2".to_string(),
            label: "Field 2".to_string(),
            field_type: FormFieldType::Checkbox,
            default_value: None,
        },
    ];

    // Create
    let template = form::create_form_template(&conn, &space_str, "Test Form", fields.clone()).unwrap();
    assert_eq!(template.name, "Test Form");
    assert_eq!(template.fields.len(), 2);

    // Get
    let fetched = form::get_form_template(&conn, &template.id).unwrap();
    assert_eq!(fetched.name, "Test Form");
    assert_eq!(fetched.fields[0].name, "field1");

    // Update
    let updated_fields = vec![FormField {
        name: "field1_updated".to_string(),
        label: "Field 1 Updated".to_string(),
        field_type: FormFieldType::Text,
        default_value: None,
    }];
    form::update_form_template(&conn, &template.id, "Updated Form", updated_fields).unwrap();

    let updated = form::get_form_template(&conn, &template.id).unwrap();
    assert_eq!(updated.name, "Updated Form");
    assert_eq!(updated.fields.len(), 1);
    assert_eq!(updated.fields[0].name, "field1_updated");

    // List
    let list = form::get_form_templates_for_space(&conn, &space_str).unwrap();
    assert_eq!(list.len(), 1);

    // Delete
    form::delete_form_template(&conn, &template.id).unwrap();
    let result = form::get_form_template(&conn, &template.id);
    assert!(result.is_err());
}
