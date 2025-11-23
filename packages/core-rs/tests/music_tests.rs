use core_rs::db;
use core_rs::music;
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
fn test_track_creation_and_retrieval() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Music Space").unwrap();

    let track = music::create_track(
        &conn,
        space_id,
        "My Song",
        Some("Artist".to_string()),
        Some("Album".to_string()),
    )
    .unwrap();

    assert_eq!(track.title, "My Song");
    assert_eq!(track.artist, Some("Artist".to_string()));

    let tracks = music::get_tracks(&conn, space_id).unwrap();
    assert_eq!(tracks.len(), 1);
    assert_eq!(tracks[0].id, track.id);
}

#[test]
fn test_playlist_creation_and_retrieval() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Music Space").unwrap();

    let playlist = music::create_playlist(
        &conn,
        space_id,
        "My Playlist",
        Some("Chill vibes".to_string()),
    )
    .unwrap();

    assert_eq!(playlist.name, "My Playlist");

    let playlists = music::get_playlists(&conn, space_id).unwrap();
    assert_eq!(playlists.len(), 1);
    assert_eq!(playlists[0].id, playlist.id);
}
