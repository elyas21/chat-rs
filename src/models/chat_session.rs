use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatSession {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub room_name: String,
    pub participants: Vec<String>,
}

impl ChatSession {
    pub fn new(room_name: String, participants: Vec<String>) -> Self {
        ChatSession { id: None, room_name, participants }
    }
}
