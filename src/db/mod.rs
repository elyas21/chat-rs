use mongodb::{
    Client, Collection, Database,
    bson::{doc, oid::ObjectId},
    error::Result as MongoResult,
    options::{ClientOptions, ReadPreference, SelectionCriteria},
};
use std::time::Duration;

use crate::models::chat_session::ChatSession;
use crate::models::message::Message;
use crate::models::user::User;
use anyhow::Result;
use mongodb::options::CollectionOptions;

pub const USERS_COLLECTION: &str = "users";
pub const SESSIONS_COLLECTION: &str = "chat_sessions";
pub const MESSAGES_COLLECTION: &str = "messages";

/// Build a MongoDB client without a blocking ping on startup.
/// The driver connects lazily on the first actual database operation.
/// For non-SRV URIs, `parse` completes instantly (no DNS lookup needed).
pub async fn build_client(uri: &str, db_name: &str) -> MongoResult<Database> {
    let mut client_options = ClientOptions::parse(uri).await?;
    client_options.server_selection_timeout = Some(Duration::from_secs(60));
    client_options.connect_timeout = Some(Duration::from_secs(30));
    client_options.selection_criteria = Some(SelectionCriteria::ReadPreference(
        ReadPreference::SecondaryPreferred { options: None },
    ));

    let client = Client::with_options(client_options)?;
    println!("MongoDB client ready (will connect on first request).");
    Ok(client.database(db_name))
}

fn users_collection(db: &Database) -> Collection<User> {
    let opts = CollectionOptions::builder()
        .selection_criteria(SelectionCriteria::ReadPreference(
            ReadPreference::SecondaryPreferred { options: None },
        ))
        .build();
    db.collection_with_options::<User>(USERS_COLLECTION, opts)
}

fn chat_collection(db: &Database) -> Collection<ChatSession> {
    let opts = CollectionOptions::builder()
        .selection_criteria(SelectionCriteria::ReadPreference(
            ReadPreference::SecondaryPreferred { options: None },
        ))
        .build();
    db.collection_with_options::<ChatSession>(SESSIONS_COLLECTION, opts)
}

fn messages_collection(db: &Database) -> Collection<Message> {
    let opts = CollectionOptions::builder()
        .selection_criteria(SelectionCriteria::ReadPreference(
            ReadPreference::SecondaryPreferred { options: None },
        ))
        .build();
    db.collection_with_options::<Message>(MESSAGES_COLLECTION, opts)
}

/// Insert a new user into MongoDB.
pub async fn add_user(db: &Database, user: User) -> Result<User> {
    let col = users_collection(db);
    let result = col.insert_one(user.clone()).await?;
    let id = result.inserted_id.as_object_id();
    Ok(User { id, ..user })
}

pub async fn add_chat_session(db: &Database, chat_session: ChatSession) -> Result<ChatSession> {
    let col = chat_collection(db);
    let result = col.insert_one(chat_session.clone()).await?;
    let id = result.inserted_id.as_object_id();
    Ok(ChatSession { id, ..chat_session })
}

/// Retrieve all users from MongoDB.
pub async fn get_users(db: &Database) -> Result<Vec<User>> {
    use futures_util::TryStreamExt;
    use mongodb::bson::Document;

    let col = users_collection(db);
    let cursor = col.find(Document::new()).await?;
    let users: Vec<User> = cursor.try_collect().await?;
    Ok(users)
}

pub async fn add_message(db: &Database, message: Message) -> Result<Message> {
    let col = messages_collection(db);
    let result = col.insert_one(message.clone()).await?;
    let id = result.inserted_id.as_object_id();
    Ok(Message { id, ..message })
}

pub async fn get_messages_by_session(db: &Database, session_id: &str) -> Result<Vec<Message>> {
    use futures_util::TryStreamExt;
    let col = messages_collection(db);
    let cursor = col.find(doc! { "session_id": session_id }).await?;
    let messages: Vec<Message> = cursor.try_collect().await?;
    Ok(messages)
}

/// Retrieve a single user by their MongoDB ObjectId string.
pub async fn get_user_by_id(db: &Database, id: &str) -> Result<User> {
    let oid = ObjectId::parse_str(id)?;
    let col = users_collection(db);
    let user = col
        .find_one(doc! { "_id": oid })
        .await?
        .ok_or_else(|| anyhow::anyhow!("User with id {} not found", id))?;
    Ok(user)
}
