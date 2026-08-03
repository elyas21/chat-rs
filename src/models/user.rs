use std::str;

use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub email: String,
    pub password_hash: Option<String>,

}

impl User {
    pub fn new(name: String, email: String) -> Self {
        User {
            id: None,
            name,
            email,
            password_hash: None,
        }
    }
}
