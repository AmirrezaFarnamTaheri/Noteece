use crate::db::DbError;
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Track {
    pub id: Ulid,
    pub space_id: Ulid,
    pub title: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: Option<i64>,
    pub uri: Option<String>,
    pub artwork_url: Option<String>,
    pub genre: Option<String>,
    pub year: Option<i64>,
    pub track_number: Option<i64>,
    pub play_count: i64,
    pub last_played_at: Option<i64>,
    pub is_favorite: bool,
    pub added_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Playlist {
    pub id: Ulid,
    pub space_id: Ulid,
    pub name: String,
    pub description: Option<String>,
    pub artwork_url: Option<String>,
    pub is_smart_playlist: bool,
    pub smart_criteria_json: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

pub fn create_track(
    conn: &Connection,
    space_id: Ulid,
    title: &str,
    artist: Option<String>,
    album: Option<String>,
) -> Result<Track, DbError> {
    let now = chrono::Utc::now().timestamp();
    let track = Track {
        id: Ulid::new(),
        space_id,
        title: title.to_string(),
        artist,
        album,
        duration: None,
        uri: None,
        artwork_url: None,
        genre: None,
        year: None,
        track_number: None,
        play_count: 0,
        last_played_at: None,
        is_favorite: false,
        added_at: now,
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO track (id, space_id, title, artist, album, added_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            &track.id.to_string(),
            &track.space_id.to_string(),
            &track.title,
            &track.artist,
            &track.album,
            &track.added_at,
            &track.updated_at
        ],
    )?;

    Ok(track)
}

pub fn create_playlist(
    conn: &Connection,
    space_id: Ulid,
    name: &str,
    description: Option<String>,
) -> Result<Playlist, DbError> {
    let now = chrono::Utc::now().timestamp();
    let playlist = Playlist {
        id: Ulid::new(),
        space_id,
        name: name.to_string(),
        description,
        artwork_url: None,
        is_smart_playlist: false,
        smart_criteria_json: None,
        created_at: now,
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO playlist (id, space_id, name, description, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            &playlist.id.to_string(),
            &playlist.space_id.to_string(),
            &playlist.name,
            &playlist.description,
            &playlist.created_at,
            &playlist.updated_at
        ],
    )?;

    Ok(playlist)
}

pub fn get_tracks(conn: &Connection, space_id: Ulid) -> Result<Vec<Track>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, title, artist, album, duration, uri, artwork_url,
                genre, year, track_number, play_count, last_played_at, is_favorite,
                added_at, updated_at
         FROM track
         WHERE space_id = ?1
         ORDER BY title ASC",
    )?;

    let tracks = stmt
        .query_map([space_id.to_string()], |row| {
            Ok(Track {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                title: row.get(2)?,
                artist: row.get(3)?,
                album: row.get(4)?,
                duration: row.get(5)?,
                uri: row.get(6)?,
                artwork_url: row.get(7)?,
                genre: row.get(8)?,
                year: row.get(9)?,
                track_number: row.get(10)?,
                play_count: row.get(11)?,
                last_played_at: row.get(12)?,
                is_favorite: row.get::<_, i32>(13)? != 0,
                added_at: row.get(14)?,
                updated_at: row.get(15)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(tracks)
}

pub fn get_playlists(conn: &Connection, space_id: Ulid) -> Result<Vec<Playlist>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, name, description, artwork_url, is_smart_playlist,
                smart_criteria_json, created_at, updated_at
         FROM playlist
         WHERE space_id = ?1
         ORDER BY name ASC",
    )?;

    let playlists = stmt
        .query_map([space_id.to_string()], |row| {
            Ok(Playlist {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                name: row.get(2)?,
                description: row.get(3)?,
                artwork_url: row.get(4)?,
                is_smart_playlist: row.get::<_, i32>(5)? != 0,
                smart_criteria_json: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(playlists)
}
