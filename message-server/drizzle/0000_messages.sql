CREATE TABLE messages (
 id TEXT PRIMARY KEY NOT NULL,
 token_hash TEXT NOT NULL UNIQUE,
 author TEXT NOT NULL,
 body TEXT NOT NULL,
 created_at TEXT NOT NULL,
 read_at TEXT,
 ip_hash TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE replies (
 id TEXT PRIMARY KEY NOT NULL,
 message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
 body TEXT NOT NULL,
 created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX messages_created ON messages(created_at);
--> statement-breakpoint
CREATE INDEX messages_ip_created ON messages(ip_hash,created_at);
--> statement-breakpoint
CREATE INDEX replies_message ON replies(message_id,created_at);
