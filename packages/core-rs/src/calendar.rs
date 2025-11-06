use crate::db::DbError;
use crate::task::create_task;
use ical::IcalParser;
use rusqlite::Connection;
use std::fs::File;
use std::io::BufReader;
use ulid::Ulid;

pub fn import_ics(conn: &Connection, path: &str, space_id: Ulid) -> Result<(), DbError> {
    log::info!("[calendar] Importing ICS file from: {}", path);
    let buf = BufReader::new(
        File::open(path)
            .map_err(|e| DbError::Message(format!("Could not open ICS file: {}", e)))?,
    );
    let reader = IcalParser::new(buf);

    for calendar in reader {
        match calendar {
            Ok(cal) => {
                for event in cal.events {
                    let title = event
                        .properties
                        .iter()
                        .find(|p| p.name == "SUMMARY")
                        .map(|p| p.value.clone().unwrap_or_default())
                        .unwrap_or_default();

                    let description = event
                        .properties
                        .iter()
                        .find(|p| p.name == "DESCRIPTION")
                        .map(|p| p.value.clone().unwrap_or_default());

                    create_task(conn, space_id, &title, description)?;
                }
            }
            Err(e) => return Err(DbError::Message(format!("Could not parse ICS file: {}", e))),
        }
    }

    Ok(())
}

use ics::{
    properties::{Description, Summary},
    Event, ICalendar,
};

pub fn export_ics(conn: &Connection, path: &str, space_id: Ulid) -> Result<(), DbError> {
    log::info!("[calendar] Exporting ICS file to: {}", path);
    let mut stmt = conn.prepare("SELECT title, description FROM task WHERE space_id = ?1")?;
    let mut rows = stmt.query([space_id.to_string()])?;

    let mut calendar = ICalendar::new("2.0", "-//hacksw/handcal//NONSGML v1.0//EN");

    while let Some(row) = rows.next()? {
        let title: String = row.get(0)?;
        let description: Option<String> = row.get(1)?;
        let mut event = Event::new(ulid::Ulid::new().to_string(), "19970714T170000Z");
        event.push(Summary::new(title));
        if let Some(d) = description {
            event.push(Description::new(d));
        }
        calendar.add_event(event);
    }

    let mut file = File::create(path)
        .map_err(|e| DbError::Message(format!("Could not create ICS file: {}", e)))?;
    calendar
        .write(&mut file)
        .map_err(|e| DbError::Message(format!("Could not write to ICS file: {}", e)))?;

    Ok(())
}
