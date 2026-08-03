use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: Option<String>,
    pub session_id: String,
    pub sender_id: String,
    pub content: String,
    pub timestamp: i64,
}

impl Message {
    pub fn new(session_id: String, sender_id: String, content: String, timestamp: i64) -> Self {
        let id = format!("msg_{}", uuid::Uuid::new_v4());
        Message {
            id: Some(id),
            session_id,
            sender_id,
            content,
            timestamp,
        }
    }
}
