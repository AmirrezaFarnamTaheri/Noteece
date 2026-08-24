use core_rs::caldav::models::*;
use core_rs::caldav::parser::parse_calendar_response;

#[test]
fn test_parse_calendar_response_with_valid_xml() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/calendars/user/cal/event1.ics</d:href>
    <d:propstat>
      <d:prop>
        <cal:calendar-data>BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260101T120000Z
DTEND:20260101T130000Z
SUMMARY:Test Event
DESCRIPTION:A test event
UID:test-event-001
END:VEVENT
END:VCALENDAR</cal:calendar-data>
        <d:getetag>"abc123"</d:getetag>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>"#;

    let events = parse_calendar_response(xml);
    assert!(events.is_ok(), "Failed to parse valid CalDAV XML response");
    let events = events.unwrap();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].summary, "Test Event");
    assert_eq!(events[0].uid, "test-event-001");
}

#[test]
fn test_parse_calendar_response_empty() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:">
</d:multistatus>"#;

    let events = parse_calendar_response(xml);
    assert!(events.is_ok());
    assert_eq!(events.unwrap().len(), 0);
}

#[test]
fn test_parse_calendar_response_malformed_xml() {
    let xml = "not xml at all";
    let result = parse_calendar_response(xml);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 0);
}

#[test]
fn test_cal_dav_event_serialization() {
    let event = CalDavEvent {
        uid: "test-uid-001".to_string(),
        summary: "Meeting with team".to_string(),
        description: Some("Discuss Q1 goals".to_string()),
        start_time: 1735732800,
        end_time: Some(1735736400),
        location: Some("Conference Room A".to_string()),
        status: "CONFIRMED".to_string(),
        last_modified: 1735732800,
        etag: Some("\"etag123\"".to_string()),
    };

    let json = serde_json::to_string(&event).expect("Failed to serialize event");
    let deserialized: CalDavEvent =
        serde_json::from_str(&json).expect("Failed to deserialize event");
    assert_eq!(deserialized.uid, "test-uid-001");
    assert_eq!(deserialized.summary, "Meeting with team");
    assert_eq!(
        deserialized.description.as_deref(),
        Some("Discuss Q1 goals")
    );
}

#[test]
fn test_cal_dav_event_minimal() {
    let event = CalDavEvent {
        uid: "minimal-event".to_string(),
        summary: "Quick event".to_string(),
        description: None,
        start_time: 1735732800,
        end_time: None,
        location: None,
        status: "CONFIRMED".to_string(),
        last_modified: 1735732800,
        etag: None,
    };

    let json = serde_json::to_string(&event).expect("Failed to serialize minimal event");
    let deserialized: CalDavEvent =
        serde_json::from_str(&json).expect("Failed to deserialize minimal event");
    assert_eq!(deserialized.uid, "minimal-event");
    assert!(deserialized.description.is_none());
    assert!(deserialized.end_time.is_none());
    assert!(deserialized.location.is_none());
}

#[test]
fn test_sync_direction_serialization() {
    assert_eq!(
        serde_json::to_string(&SyncDirection::Pull).unwrap(),
        "\"pull\""
    );
    assert_eq!(
        serde_json::to_string(&SyncDirection::Push).unwrap(),
        "\"push\""
    );
    assert_eq!(
        serde_json::to_string(&SyncDirection::Bidirectional).unwrap(),
        "\"bidirectional\""
    );
}

#[test]
fn test_sync_direction_as_str() {
    assert_eq!(SyncDirection::Pull.as_str(), "pull");
    assert_eq!(SyncDirection::Push.as_str(), "push");
    assert_eq!(SyncDirection::Bidirectional.as_str(), "bidirectional");
}

#[test]
fn test_sync_result_serialization() {
    let result = SyncResult {
        account_id: "acc-001".to_string(),
        sync_time: 1735732800,
        direction: SyncDirection::Bidirectional,
        events_pulled: 5,
        events_pushed: 2,
        conflicts: 1,
        errors: vec![],
        success: true,
    };

    let json = serde_json::to_string(&result).expect("Failed to serialize SyncResult");
    let deserialized: SyncResult =
        serde_json::from_str(&json).expect("Failed to deserialize SyncResult");
    assert_eq!(deserialized.account_id, "acc-001");
    assert_eq!(deserialized.events_pulled, 5);
    assert!(deserialized.success);
}

#[test]
fn test_conflict_resolution_variants() {
    let local = ConflictResolution::AcceptLocal;
    let remote = ConflictResolution::AcceptRemote;
    let merge = ConflictResolution::Merge;

    assert_eq!(serde_json::to_string(&local).unwrap(), "\"acceptlocal\"");
    assert_eq!(serde_json::to_string(&remote).unwrap(), "\"acceptremote\"");
    assert_eq!(serde_json::to_string(&merge).unwrap(), "\"merge\"");
}

#[test]
fn test_parse_calendar_response_with_multiple_events() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/calendars/user/cal/event1.ics</d:href>
    <d:propstat>
      <d:prop>
        <cal:calendar-data>BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260101T120000Z
DTEND:20260101T130000Z
SUMMARY:First Event
UID:evt-001
END:VEVENT
BEGIN:VEVENT
DTSTART:20260102T120000Z
DTEND:20260102T130000Z
SUMMARY:Second Event
UID:evt-002
END:VEVENT
END:VCALENDAR</cal:calendar-data>
        <d:getetag>"etag456"</d:getetag>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>"#;

    let events = parse_calendar_response(xml);
    assert!(events.is_ok());
    let events = events.unwrap();
    assert_eq!(events.len(), 2);
}
