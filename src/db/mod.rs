use anyhow::Result;
use redis::AsyncCommands;
use redis::aio::MultiplexedConnection;
use std::time::Duration;

use crate::models::chat_session::ChatSession;
use crate::models::message::Message;
use crate::models::user::User;

pub const USERS_INDEX_KEY: &str = "users:index";
pub const SESSIONS_INDEX_KEY: &str = "sessions:index";

/// Acquire an async multiplexed connection to Redis with automatic fallback
pub async fn get_con(client: &redis::Client) -> Result<MultiplexedConnection> {
    if let Ok(Ok(con)) = tokio::time::timeout(
        Duration::from_secs(2),
        client.get_multiplexed_async_connection(),
    )
    .await
    {
        return Ok(con);
    }

    // Fallback to local Redis if cloud endpoint is unreachable
    let local_client = redis::Client::open("redis://127.0.0.1:6379")?;
    let local_con = tokio::time::timeout(
        Duration::from_secs(2),
        local_client.get_multiplexed_async_connection(),
    )
    .await??;
    Ok(local_con)
}

/// Insert a new user into Redis
pub async fn add_user(client: &redis::Client, user: User) -> Result<User> {
    let mut con = get_con(client).await?;
    let user_id = user.id.clone().unwrap_or_else(|| format!("usr_{}", uuid::Uuid::new_v4()));
    let full_user = User {
        id: Some(user_id.clone()),
        ..user
    };

    let json_val = serde_json::to_string(&full_user)?;
    let key = format!("user:{}", user_id);

    let _: () = con.set(&key, json_val).await?;
    let _: () = con.sadd(USERS_INDEX_KEY, &user_id).await?;

    Ok(full_user)
}

/// Retrieve all users from Redis
pub async fn get_users(client: &redis::Client) -> Result<Vec<User>> {
    let mut con = get_con(client).await?;
    let user_ids: Vec<String> = con.smembers(USERS_INDEX_KEY).await.unwrap_or_default();
    let mut users = Vec::new();

    for id in user_ids {
        let key = format!("user:{}", id);
        if let Ok(raw_json) = con.get::<_, Option<String>>(&key).await {
            if let Some(json_str) = raw_json {
                if let Ok(u) = serde_json::from_str::<User>(&json_str) {
                    users.push(u);
                }
            }
        }
    }

    Ok(users)
}

/// Retrieve user by ID from Redis
pub async fn get_user_by_id(client: &redis::Client, id: &str) -> Result<User> {
    let mut con = get_con(client).await?;
    let key = format!("user:{}", id);
    let raw_json: Option<String> = con.get(&key).await?;
    match raw_json {
        Some(json) => Ok(serde_json::from_str(&json)?),
        None => Err(anyhow::anyhow!("User with ID '{}' not found in Redis", id)),
    }
}

/// Create new chat session in Redis
pub async fn add_chat_session(client: &redis::Client, session: ChatSession) -> Result<ChatSession> {
    let mut con = get_con(client).await?;
    let session_id = session.id.clone().unwrap_or_else(|| format!("sess_{}", uuid::Uuid::new_v4()));
    let full_session = ChatSession {
        id: Some(session_id.clone()),
        ..session
    };

    let json_val = serde_json::to_string(&full_session)?;
    let key = format!("session:{}", session_id);

    let _: () = con.set(&key, json_val).await?;
    let _: () = con.sadd(SESSIONS_INDEX_KEY, &session_id).await?;

    Ok(full_session)
}

/// Retrieve all chat sessions from Redis
pub async fn get_chat_sessions(client: &redis::Client) -> Result<Vec<ChatSession>> {
    let mut con = get_con(client).await?;
    let session_ids: Vec<String> = con.smembers(SESSIONS_INDEX_KEY).await.unwrap_or_default();
    let mut sessions = Vec::new();

    for id in session_ids {
        let key = format!("session:{}", id);
        if let Ok(raw_json) = con.get::<_, Option<String>>(&key).await {
            if let Some(json_str) = raw_json {
                if let Ok(s) = serde_json::from_str::<ChatSession>(&json_str) {
                    sessions.push(s);
                }
            }
        }
    }

    Ok(sessions)
}

/// Save message to Redis List
pub async fn add_message(client: &redis::Client, message: Message) -> Result<Message> {
    let mut con = get_con(client).await?;
    let msg_id = message.id.clone().unwrap_or_else(|| format!("msg_{}", uuid::Uuid::new_v4()));
    let full_msg = Message {
        id: Some(msg_id),
        ..message
    };

    let json_val = serde_json::to_string(&full_msg)?;
    let key = format!("messages:{}", full_msg.session_id);

    let _: () = con.rpush(&key, json_val).await?;

    Ok(full_msg)
}

/// Get messages for a chat session from Redis
pub async fn get_messages_by_session(client: &redis::Client, session_id: &str) -> Result<Vec<Message>> {
    let mut con = get_con(client).await?;
    let key = format!("messages:{}", session_id);
    let raw_msgs: Vec<String> = con.lrange(&key, 0, -1).await?;

    let mut messages = Vec::new();
    for raw in raw_msgs {
        match serde_json::from_str::<Message>(&raw) {
            Ok(msg) => messages.push(msg),
            Err(e) => eprintln!("Failed to parse Message JSON from Redis: {}", e),
        }
    }

    Ok(messages)
}
