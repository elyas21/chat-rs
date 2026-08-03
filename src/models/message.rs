use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub session_id: String,
    pub sender_id: String,
    pub content: String,
    pub timestamp: i64,
}

impl Message {
    pub fn new(session_id: String, sender_id: String, content: String, timestamp: i64) -> Self {
        Message { id: None, session_id, sender_id, content, timestamp }
    }
}
