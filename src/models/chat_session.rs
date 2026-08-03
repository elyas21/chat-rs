use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatSession {
    pub id: Option<String>,
    pub room_name: String,
    pub participants: Vec<String>,
    #[serde(default)]
    pub is_direct: Option<bool>,
}

impl ChatSession {
    pub fn new(room_name: String, participants: Vec<String>) -> Self {
        let id = format!("sess_{}", uuid::Uuid::new_v4());
        ChatSession {
            id: Some(id),
            room_name,
            participants,
            is_direct: Some(false),
        }
    }
}
