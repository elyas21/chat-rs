use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: Option<String>,
    pub name: String,
    pub email: String,
    pub password_hash: Option<String>,
}

impl User {
    pub fn new(name: String, email: String) -> Self {
        let id = format!("usr_{}", uuid::Uuid::new_v4());
        User {
            id: Some(id),
            name,
            email,
            password_hash: None,
        }
    }
}
