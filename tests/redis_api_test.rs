use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use rs_chat::{
    AppState, db,
    models::{chat_session::ChatSession, message::Message, user::User},
    routes,
};
use tower::ServiceExt;

fn get_test_url() -> String {
    dotenvy::dotenv().ok();
    std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string())
}

async fn get_test_conn_manager() -> redis::aio::ConnectionManager {
    let url = get_test_url();
    if let Ok(client) = redis::Client::open(url.clone()) {
        if let Ok(Ok(mgr)) = tokio::time::timeout(
            std::time::Duration::from_secs(2),
            redis::aio::ConnectionManager::new(client),
        )
        .await
        {
            return mgr;
        }
    }

    let local_client = redis::Client::open("redis://127.0.0.1:6379").expect("Failed to create local Redis client");
    redis::aio::ConnectionManager::new(local_client)
        .await
        .expect("Failed to connect to local test Redis")
}

async fn get_test_app_state() -> AppState {
    let url = get_test_url();
    if let Ok(state) = AppState::new(&url).await {
        return state;
    }
    AppState::new("redis://127.0.0.1:6379").await.expect("Failed to create local AppState")
}

#[tokio::test]
async fn test_redis_connection() {
    let conn_mgr = get_test_conn_manager().await;
    let mut con = db::get_con(&conn_mgr)
        .await
        .expect("Failed to get Redis connection");
    let ping_res: String = redis::cmd("PING")
        .query_async(&mut con)
        .await
        .expect("PING command failed");
    assert_eq!(ping_res, "PONG");
}

#[tokio::test]
async fn test_user_persistence() {
    let conn_mgr = get_test_conn_manager().await;
    let unique_email = format!("test_{}@example.com", uuid::Uuid::new_v4());
    let test_user = User::new("Integration Test User".to_string(), unique_email);

    // Test Create User
    let created = db::add_user(&conn_mgr, test_user.clone())
        .await
        .expect("Failed to add user");
    assert!(created.id.is_some());

    let user_id = created.id.unwrap();

    // Test Get User by ID
    let fetched = db::get_user_by_id(&conn_mgr, &user_id)
        .await
        .expect("Failed to fetch user by ID");
    assert_eq!(fetched.name, "Integration Test User");

    // Test Get All Users
    let all_users = db::get_users(&conn_mgr)
        .await
        .expect("Failed to fetch all users");
    assert!(all_users.iter().any(|u| u.id.as_deref() == Some(&user_id)));
}

#[tokio::test]
async fn test_session_persistence() {
    let conn_mgr = get_test_conn_manager().await;
    let room_name = format!("Test Room {}", uuid::Uuid::new_v4());
    let test_session = ChatSession::new(
        room_name,
        vec!["usr_123".to_string(), "usr_456".to_string()],
    );

    // Test Create Session
    let created = db::add_chat_session(&conn_mgr, test_session)
        .await
        .expect("Failed to add chat session");
    assert!(created.id.is_some());

    let session_id = created.id.unwrap();

    // Test Get All Sessions
    let all_sessions = db::get_chat_sessions(&conn_mgr)
        .await
        .expect("Failed to fetch chat sessions");
    assert!(all_sessions.iter().any(|s| s.id.as_deref() == Some(&session_id)));
}

#[tokio::test]
async fn test_message_persistence() {
    let conn_mgr = get_test_conn_manager().await;
    let session_id = format!("sess_test_{}", uuid::Uuid::new_v4());
    let test_msg = Message::new(
        session_id.clone(),
        "usr_sender".to_string(),
        "Hello integration test!".to_string(),
        1234567890,
    );

    // Test Add Message
    let created = db::add_message(&conn_mgr, test_msg)
        .await
        .expect("Failed to add message");
    assert!(created.id.is_some());

    // Test Get Messages by Session
    let messages = db::get_messages_by_session(&conn_mgr, &session_id)
        .await
        .expect("Failed to get messages");
    assert!(!messages.is_empty());
    assert_eq!(messages[0].content, "Hello integration test!");
}

#[tokio::test]
async fn test_axum_http_api_routes() {
    let state = get_test_app_state().await;
    let app = routes::app_router(state);

    // 1. GET /v1/users
    let req = Request::builder()
        .uri("/v1/users")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 2. POST /v1/users
    let user_payload = serde_json::json!({
        "name": "API Route User",
        "email": format!("api_{}@example.com", uuid::Uuid::new_v4())
    });
    let req = Request::builder()
        .uri("/v1/users")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_vec(&user_payload).unwrap()))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);

    let body_bytes = res.into_body().collect().await.unwrap().to_bytes();
    let created_user: User = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_user.name, "API Route User");

    // 3. GET /v1/sessions
    let req = Request::builder()
        .uri("/v1/sessions")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 4. POST /v1/sessions
    let session_payload = serde_json::json!({
        "room_name": "API Test Room",
        "participants": ["usr_api_1", "usr_api_2"]
    });
    let req = Request::builder()
        .uri("/v1/sessions")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_vec(&session_payload).unwrap()))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);

    let body_bytes = res.into_body().collect().await.unwrap().to_bytes();
    let created_session: ChatSession = serde_json::from_slice(&body_bytes).unwrap();
    let session_id = created_session.id.unwrap();

    // 5. POST /v1/sessions/:id/messages
    let msg_payload = serde_json::json!({
        "sender_id": "usr_api_1",
        "content": "Hello from Axum HTTP integration test!"
    });
    let req = Request::builder()
        .uri(format!("/v1/sessions/{}/messages", session_id))
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_vec(&msg_payload).unwrap()))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    let status = res.status();
    let body_bytes = res.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(status, StatusCode::CREATED, "POST message response: {:?}", String::from_utf8_lossy(&body_bytes));

    // 6. GET /v1/sessions/:id/messages
    let req = Request::builder()
        .uri(format!("/v1/sessions/{}/messages", session_id))
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    let status = res.status();
    let body_bytes = res.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(status, StatusCode::OK, "GET messages response: {:?}", String::from_utf8_lossy(&body_bytes));

    let messages: Vec<Message> = serde_json::from_slice(&body_bytes).unwrap();
    assert!(!messages.is_empty(), "Messages list should not be empty for session {}", session_id);
    assert_eq!(messages[0].content, "Hello from Axum HTTP integration test!");
}

