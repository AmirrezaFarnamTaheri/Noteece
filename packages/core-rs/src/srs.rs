use crate::db::DbError;
use chrono::{Duration, Utc};
use rusqlite::{Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub enum CardState {
    New,
    Learning,
    Review,
    Relearning,
}

impl CardState {
    fn as_str(&self) -> &'static str {
        match self {
            CardState::New => "new",
            CardState::Learning => "learning",
            CardState::Review => "review",
            CardState::Relearning => "relearning",
        }
    }

    fn from_str(s: &str) -> Result<Self, DbError> {
        match s {
            "new" => Ok(CardState::New),
            "learning" => Ok(CardState::Learning),
            "review" => Ok(CardState::Review),
            "relearning" => Ok(CardState::Relearning),
            _ => Err(DbError::Message("Invalid card state".into())),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RevisionHistory {
    pub review_at: i64,
    pub rating: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KnowledgeCard {
    pub id: Ulid,
    pub note_id: Ulid,
    pub deck_id: Option<String>,
    pub state: CardState,
    pub due_at: i64,
    pub stability: f64,
    pub difficulty: f64,
    pub lapses: i64,
    pub revision_history: Vec<RevisionHistory>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReviewLog {
    pub id: Ulid,
    pub card_id: Ulid,
    pub review_at: i64,
    pub rating: i64,
    pub state: CardState,
    pub due_at: i64,
    pub stability: f64,
    pub difficulty: f64,
    pub lapses: i64,
}

use serde_json;
pub fn create_knowledge_card(conn: &Connection, note_id: Ulid) -> Result<KnowledgeCard, DbError> {
    log::info!("[srs] Creating knowledge card for note: {}", note_id);
    let now = Utc::now().timestamp();
    let card = KnowledgeCard {
        id: Ulid::new(),
        note_id,
        deck_id: None,
        state: CardState::New,
        due_at: now,
        stability: 0.0,
        difficulty: 0.0,
        lapses: 0,
        revision_history: Vec::new(),
    };
    let revision_history_json = serde_json::to_string(&card.revision_history)?;

    conn.execute(
        "INSERT INTO knowledge_card (id, note_id, deck_id, state, due_at, stability, difficulty, lapses, revision_history_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            &card.id.to_string(),
            &card.note_id.to_string(),
            &card.deck_id,
            &card.state.as_str(),
            &card.due_at,
            &card.stability,
            &card.difficulty,
            &card.lapses,
            &revision_history_json,
        ],
    )?;

    Ok(card)
}

pub fn get_knowledge_card(conn: &Connection, id: Ulid) -> Result<Option<KnowledgeCard>, DbError> {
    log::info!("[srs] Getting knowledge card with id: {}", id);
    let mut stmt = conn.prepare("SELECT id, note_id, deck_id, state, due_at, stability, difficulty, lapses, revision_history_json FROM knowledge_card WHERE id = ?1")?;
    let card: Option<KnowledgeCard> = stmt
        .query_row([id.to_string()], |row| {
            let revision_history_json: String = row.get(8)?;
            let revision_history: Vec<RevisionHistory> =
                serde_json::from_str(&revision_history_json).map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(
                        8,
                        rusqlite::types::Type::Text,
                        Box::new(e),
                    )
                })?;

            let id_str: String = row.get(0)?;
            let note_id_str: String = row.get(1)?;
            let state_str: String = row.get(3)?;

            Ok(KnowledgeCard {
                id: Ulid::from_string(&id_str).map_err(|e| rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e)))?,
                note_id: Ulid::from_string(&note_id_str).map_err(|e| rusqlite::Error::FromSqlConversionFailure(1, rusqlite::types::Type::Text, Box::new(e)))?,
                deck_id: row.get(2)?,
                state: CardState::from_str(&state_str).map_err(|e| rusqlite::Error::FromSqlConversionFailure(3, rusqlite::types::Type::Text, Box::new(e)))?,
                due_at: row.get(4)?,
                stability: row.get(5)?,
                difficulty: row.get(6)?,
                lapses: row.get(7)?,
                revision_history,
            })
        })
        .optional()?;
    Ok(card)
}

pub fn review_card(conn: &Connection, card_id: Ulid, rating: i64) -> Result<(), DbError> {
    log::info!("[srs] Reviewing card: {}, rating: {}", card_id, rating);
    let mut card =
        get_knowledge_card(conn, card_id)?.ok_or(DbError::Message("Card not found".into()))?;

    let now = Utc::now();
    let (new_stability, new_difficulty) = if card.state == CardState::New {
        let stability = match rating {
            1 => 1.0,
            2 => 3.0,
            3 => 7.0,
            _ => 1.0,
        };
        card.state = CardState::Review;
        (stability, card.difficulty)
    } else {
        let interval = (now.timestamp() - card.due_at) as f64 / 86400.0;
        let difficulty = (card.difficulty + (rating as f64 - 3.0) * 0.1).clamp(0.0, 1.0);
        let ease_factor = 2.5 - 0.8 * difficulty + 0.28 * difficulty * difficulty;
        let stability = if rating >= 2 {
            card.stability * (1.0 + (ease_factor - 1.0) * interval.max(1.0))
        } else {
            card.lapses += 1;
            card.stability * 0.5
        };
        (stability, difficulty)
    };

    let next_due = now + Duration::days(new_stability as i64);

    let log_entry = ReviewLog {
        id: Ulid::new(),
        card_id,
        review_at: now.timestamp(),
        rating,
        state: card.state.clone(),
        due_at: next_due.timestamp(),
        stability: new_stability,
        difficulty: new_difficulty,
        lapses: card.lapses,
    };

    conn.execute(
        "INSERT INTO review_log (id, card_id, review_at, rating, state, due_at, stability, difficulty, lapses) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            log_entry.id.to_string(),
            log_entry.card_id.to_string(),
            log_entry.review_at,
            log_entry.rating,
            log_entry.state.as_str(),
            log_entry.due_at,
            log_entry.stability,
            log_entry.difficulty,
            log_entry.lapses,
        ],
    )?;

    card.due_at = next_due.timestamp();
    card.stability = new_stability;
    card.difficulty = new_difficulty;
    card.revision_history.push(RevisionHistory {
        review_at: now.timestamp(),
        rating,
    });
    let revision_history_json = serde_json::to_string(&card.revision_history)?;

    conn.execute(
        "UPDATE knowledge_card SET state = ?1, due_at = ?2, stability = ?3, difficulty = ?4, lapses = ?5, revision_history_json = ?6 WHERE id = ?7",
        rusqlite::params![
            card.state.as_str(),
            card.due_at,
            card.stability,
            card.difficulty,
            card.lapses,
            revision_history_json,
            card.id.to_string(),
        ],
    )?;

    Ok(())
}

pub fn get_due_cards(conn: &Connection) -> Result<Vec<KnowledgeCard>, DbError> {
    log::info!("[srs] Getting due cards");
    let now = Utc::now().timestamp();
    let mut stmt = conn.prepare("SELECT id, note_id, deck_id, state, due_at, stability, difficulty, lapses, revision_history_json FROM knowledge_card WHERE due_at <= ?1")?;
    let cards = stmt
        .query_map([now], |row| {
            let revision_history_json: String = row.get(8)?;
            let revision_history: Vec<RevisionHistory> =
                serde_json::from_str(&revision_history_json).map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(
                        8,
                        rusqlite::types::Type::Text,
                        Box::new(e),
                    )
                })?;

            let id_str: String = row.get(0)?;
            let note_id_str: String = row.get(1)?;
            let state_str: String = row.get(3)?;

            Ok(KnowledgeCard {
                id: Ulid::from_string(&id_str).map_err(|e| rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e)))?,
                note_id: Ulid::from_string(&note_id_str).map_err(|e| rusqlite::Error::FromSqlConversionFailure(1, rusqlite::types::Type::Text, Box::new(e)))?,
                deck_id: row.get(2)?,
                state: CardState::from_str(&state_str).map_err(|e| rusqlite::Error::FromSqlConversionFailure(3, rusqlite::types::Type::Text, Box::new(e)))?,
                due_at: row.get(4)?,
                stability: row.get(5)?,
                difficulty: row.get(6)?,
                lapses: row.get(7)?,
                revision_history,
            })
        })?
        .collect::<Result<Vec<KnowledgeCard>, _>>()?;
    Ok(cards)
}

pub fn get_review_logs(conn: &Connection, card_id: Ulid) -> Result<Vec<ReviewLog>, DbError> {
    log::info!("[srs] Getting review logs for card: {}", card_id);
    let mut stmt = conn.prepare("SELECT id, card_id, review_at, rating, state, due_at, stability, difficulty, lapses FROM review_log WHERE card_id = ?1")?;
    let logs = stmt
        .query_map([card_id.to_string()], |row| {
            let id_str: String = row.get(0)?;
            let card_id_str: String = row.get(1)?;
            let state_str: String = row.get(4)?;

            Ok(ReviewLog {
                id: Ulid::from_string(&id_str).map_err(|e| rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e)))?,
                card_id: Ulid::from_string(&card_id_str).map_err(|e| rusqlite::Error::FromSqlConversionFailure(1, rusqlite::types::Type::Text, Box::new(e)))?,
                review_at: row.get(2)?,
                rating: row.get(3)?,
                state: CardState::from_str(&state_str).map_err(|e| rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Text, Box::new(e)))?,
                due_at: row.get(5)?,
                stability: row.get(6)?,
                difficulty: row.get(7)?,
                lapses: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<ReviewLog>, _>>()?;
    Ok(logs)
}
