use crate::caldav::error::CalDavError;
use crate::caldav::models::CalDavEvent;
use chrono::{NaiveDate, NaiveDateTime, NaiveTime, Utc};
use std::io::BufReader;

/// Parse CalDAV XML response and extract calendar events
///
/// This function uses tolerant XML parsing that handles various namespace prefixes
/// and case variations commonly seen in CalDAV responses from different servers.
pub fn parse_calendar_response(xml_data: &str) -> Result<Vec<CalDavEvent>, CalDavError> {
    let mut events = Vec::new();

    // Convert to lowercase for case-insensitive matching
    let lower_xml = xml_data.to_lowercase();

    // Find all calendar-data elements (namespace-agnostic, case-insensitive)
    // Matches: <c:calendar-data>, <cal:calendar-data>, <C:CALENDAR-DATA>, etc.
    let mut search_pos = 0;
    while let Some(start_idx) = lower_xml[search_pos..].find(":calendar-data>") {
        let tag_start_pos = search_pos + start_idx;
        if let Some(_open_bracket) = lower_xml[..tag_start_pos].rfind('<') {
            let content_start = tag_start_pos + ":calendar-data>".len();

            if let Some(close_idx) = lower_xml[content_start..].find("</") {
                let close_tag_start = content_start + close_idx;

                // Verify this is actually a calendar-data closing tag
                let is_calendar_close = lower_xml[close_tag_start..].starts_with("</")
                    && (lower_xml[close_tag_start + 2..].starts_with("c:calendar-data>")
                        || lower_xml[close_tag_start + 2..].starts_with("cal:calendar-data>")
                        || lower_xml[close_tag_start + 2..].starts_with("calendar-data>"));

                if is_calendar_close {
                    let ical_data = &xml_data[content_start..close_tag_start];

                    if let Ok(mut parsed_events) = parse_icalendar(ical_data) {
                        events.append(&mut parsed_events);
                    }

                    search_pos = close_tag_start + "calendar-data>".len();
                } else {
                    search_pos = content_start;
                }
            } else {
                break;
            }
        } else {
            search_pos = tag_start_pos + 1;
        }
    }

    Ok(events)
}

/// Parse iCalendar format to CalDavEvent
fn parse_icalendar(ical_data: &str) -> Result<Vec<CalDavEvent>, CalDavError> {
    let buf = BufReader::new(ical_data.as_bytes());
    let reader = ical::IcalParser::new(buf);

    let mut events = Vec::new();

    for calendar in reader {
        let calendar = calendar.map_err(|e| CalDavError::Parse(e.to_string()))?;

        for event in calendar.events {
            let mut uid: Option<String> = None;
            let mut summary = String::new();
            let mut description = None;
            let mut start_time: Option<i64> = None;
            let mut end_time: Option<i64> = None;
            let mut location = None;
            let mut status = "CONFIRMED".to_string();
            let mut last_modified: Option<i64> = None;

            for property in event.properties {
                match property.name.as_str() {
                    "UID" => {
                        uid = Some(property.value.unwrap_or_default());
                    }
                    "SUMMARY" => {
                        summary = property.value.unwrap_or_default();
                    }
                    "DESCRIPTION" => {
                        description = property.value;
                    }
                    "DTSTART" => {
                        if let Some(val) = property.value {
                            // Skip event if DTSTART cannot be parsed
                            if let Ok(ts) = parse_ical_datetime(&val) {
                                start_time = Some(ts);
                            }
                        }
                    }
                    "DTEND" => {
                        if let Some(val) = property.value {
                            // DTEND is optional; only set if parsable
                            if let Ok(ts) = parse_ical_datetime(&val) {
                                end_time = Some(ts);
                            }
                        }
                    }
                    "LOCATION" => {
                        location = property.value;
                    }
                    "STATUS" => {
                        status = property.value.unwrap_or_else(|| "CONFIRMED".to_string());
                    }
                    "LAST-MODIFIED" => {
                        if let Some(val) = property.value {
                            if let Ok(ts) = parse_ical_datetime(&val) {
                                last_modified = Some(ts);
                            }
                        }
                    }
                    _ => {}
                }
            }

            // Validate required fields before adding event
            let uid = match uid {
                Some(u) if !u.is_empty() => u,
                _ => continue, // Skip events without valid UID
            };

            let start_time = match start_time {
                Some(ts) => ts,
                None => continue, // Skip events without valid DTSTART
            };

            // Use current timestamp if LAST-MODIFIED is missing
            let last_modified = last_modified.unwrap_or_else(|| Utc::now().timestamp());

            events.push(CalDavEvent {
                uid,
                summary,
                description,
                start_time,
                end_time,
                location,
                status,
                last_modified,
                etag: None,
            });
        }
    }

    Ok(events)
}

/// Parse iCalendar datetime format to Unix timestamp
///
/// Supports multiple iCalendar datetime formats:
/// - All-day events: YYYYMMDD (e.g., "20250107")
/// - DateTime: YYYYMMDDTHHMMSS (e.g., "20250107T143000")
/// - DateTime UTC: YYYYMMDDTHHMMSSZ (e.g., "20250107T143000Z")
/// - With separators: YYYY-MM-DDTHH:MM:SSZ
fn parse_ical_datetime(datetime_str: &str) -> Result<i64, CalDavError> {

    // Normalize and trim input
    let trimmed = datetime_str.trim();
    if trimmed.is_empty() {
        return Err(CalDavError::Parse("Empty datetime string".to_string()));
    }

    // Remove common separators (: and -)
    let clean_str = trimmed.replace([':', '-'], "");

    // Check for UTC 'Z' suffix and remove it
    let is_utc = clean_str.ends_with('Z') || clean_str.ends_with('z');
    let clean_str = if is_utc {
        &clean_str[..clean_str.len() - 1]
    } else {
        &clean_str
    };

    // All-day event format: YYYYMMDD (8 digits, no time component)
    if clean_str.len() == 8 && clean_str.chars().all(|c| c.is_ascii_digit()) {
        let year: i32 = clean_str
            .get(0..4)
            .and_then(|s| s.parse().ok())
            .ok_or_else(|| CalDavError::Parse(format!("Invalid year in '{}'", datetime_str)))?;

        let month: u32 = clean_str
            .get(4..6)
            .and_then(|s| s.parse().ok())
            .ok_or_else(|| CalDavError::Parse(format!("Invalid month in '{}'", datetime_str)))?;

        let day: u32 = clean_str
            .get(6..8)
            .and_then(|s| s.parse().ok())
            .ok_or_else(|| CalDavError::Parse(format!("Invalid day in '{}'", datetime_str)))?;

        let date = NaiveDate::from_ymd_opt(year, month, day).ok_or_else(|| {
            CalDavError::Parse(format!(
                "Invalid date values: year={}, month={}, day={}",
                year, month, day
            ))
        })?;

        // All-day events start at midnight UTC
        let datetime = NaiveDateTime::new(date, NaiveTime::from_hms_opt(0, 0, 0).unwrap());
        return Ok(datetime.and_utc().timestamp());
    }

    // DateTime format: Split on 'T' if present, otherwise assume contiguous date+time
    let (date_part, time_part) = if let Some(t_pos) = clean_str.find('T') {
        (&clean_str[0..t_pos], &clean_str[t_pos + 1..])
    } else if clean_str.len() >= 15 {
        // No 'T' separator, assume YYYYMMDDHHMMSS format
        (&clean_str[0..8], &clean_str[8..])
    } else {
        return Err(CalDavError::Parse(format!(
            "Invalid datetime format (expected YYYYMMDD or YYYYMMDDTHHMMSS): '{}'",
            datetime_str
        )));
    };

    // Validate date part is exactly 8 characters
    if date_part.len() != 8 {
        return Err(CalDavError::Parse(format!(
            "Invalid date part length (expected 8, got {}): '{}'",
            date_part.len(),
            datetime_str
        )));
    }

    // Validate time part is at least 6 characters (HHMMSS)
    if time_part.len() < 6 {
        return Err(CalDavError::Parse(format!(
            "Invalid time part length (expected at least 6, got {}): '{}'",
            time_part.len(),
            datetime_str
        )));
    }

    // Parse date components
    let year: i32 = date_part
        .get(0..4)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| CalDavError::Parse(format!("Invalid year in '{}'", datetime_str)))?;

    let month: u32 = date_part
        .get(4..6)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| CalDavError::Parse(format!("Invalid month in '{}'", datetime_str)))?;

    let day: u32 = date_part
        .get(6..8)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| CalDavError::Parse(format!("Invalid day in '{}'", datetime_str)))?;

    // Parse time components
    let hour: u32 = time_part
        .get(0..2)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| CalDavError::Parse(format!("Invalid hour in '{}'", datetime_str)))?;

    let minute: u32 = time_part
        .get(2..4)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| CalDavError::Parse(format!("Invalid minute in '{}'", datetime_str)))?;

    let second: u32 = time_part
        .get(4..6)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| CalDavError::Parse(format!("Invalid second in '{}'", datetime_str)))?;

    // Validate date and time values with chrono
    let date = NaiveDate::from_ymd_opt(year, month, day).ok_or_else(|| {
        CalDavError::Parse(format!(
            "Invalid date values: year={}, month={}, day={}",
            year, month, day
        ))
    })?;

    let time = NaiveTime::from_hms_opt(hour, minute, second).ok_or_else(|| {
        CalDavError::Parse(format!(
            "Invalid time values: hour={}, minute={}, second={}",
            hour, minute, second
        ))
    })?;

    let datetime = NaiveDateTime::new(date, time);

    // Treat as UTC
    Ok(datetime.and_utc().timestamp())
}
