// database/schema.js

async function createTables(connection) {
    try {
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                uuid CHAR(36) NOT NULL UNIQUE,
                email VARCHAR(150) NOT NULL UNIQUE,
                phone VARCHAR(20) UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(30) NOT NULL,
                status VARCHAR(30) DEFAULT 'pending',
                email_verified BOOLEAN DEFAULT FALSE,
                phone_verified BOOLEAN DEFAULT FALSE,
                last_login TIMESTAMP NULL,
                token_version INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email(email),
                INDEX idx_phone(phone),
                INDEX idx_role(role),
                INDEX idx_status(status)
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                gender VARCHAR(20),
                birth_date DATE,
                country VARCHAR(100),
                province VARCHAR(100),
                district VARCHAR(100),
                headline VARCHAR(200),
                bio TEXT,
                website VARCHAR(255),
                linkedin VARCHAR(255),
                profile_photo VARCHAR(500),
                cover_photo VARCHAR(500),
                verification_level VARCHAR(50) DEFAULT 'unverified',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_profile_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                icon VARCHAR(255),
                status VARCHAR(30) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS industries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                icon VARCHAR(255),
                status VARCHAR(30) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await connection.execute(`
            INSERT IGNORE INTO industries (name, status) VALUES
              ('AgriTech', 'active'), ('HealthTech', 'active'), ('FinTech', 'active'),
              ('EdTech', 'active'), ('CleanTech', 'active'), ('AI / Machine Learning', 'active'),
              ('E-Commerce', 'active'), ('Logistics', 'active'), ('Energy', 'active'),
              ('Manufacturing', 'active'), ('Real Estate', 'active'), ('Media & Entertainment', 'active');
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS startups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                owner_id INT NOT NULL,
                category_id INT NOT NULL,
                name VARCHAR(200) NOT NULL,
                slug VARCHAR(220) UNIQUE,
                description TEXT,
                problem TEXT,
                solution TEXT,
                mission TEXT,
                vision TEXT,
                business_model TEXT,
                revenue_model TEXT,
                industry VARCHAR(150),
                stage VARCHAR(100),
                funding_required DECIMAL(18,2) DEFAULT 0,
                equity_offered DECIMAL(5,2) DEFAULT 0,
                country VARCHAR(100),
                province VARCHAR(100),
                district VARCHAR(100),
                registration_type VARCHAR(50) DEFAULT 'early_stage',
                registration_number VARCHAR(100),
                registration_certificate_url VARCHAR(500),
                registration_certificate_public_id VARCHAR(255),
                logo_url VARCHAR(500),
                logo_public_id VARCHAR(255),
                verification_status VARCHAR(50) DEFAULT 'pending',
                ai_score DECIMAL(5,2) DEFAULT 0,
                status VARCHAR(30) DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_startup_owner FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_startup_category FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
                INDEX idx_owner(owner_id),
                INDEX idx_category(category_id),
                INDEX idx_stage(stage),
                INDEX idx_status(status),
                INDEX idx_verification(verification_status)
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS startup_members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                startup_id INT NOT NULL,
                name VARCHAR(150) NOT NULL,
                email VARCHAR(150),
                position VARCHAR(120),
                bio TEXT,
                photo_url VARCHAR(500),
                photo_public_id VARCHAR(255),
                ownership_percentage DECIMAL(5,2) DEFAULT 0,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_member_startup FOREIGN KEY(startup_id) REFERENCES startups(id) ON DELETE CASCADE ON UPDATE CASCADE,
                INDEX idx_member_startup(startup_id)
            );
        `);

        // ── startup_members migration: drop user_id FK and column, add name/email/bio ──
        await connection.execute(`
            ALTER TABLE startup_members
                ADD COLUMN IF NOT EXISTS name VARCHAR(150) NOT NULL DEFAULT '' AFTER startup_id,
                ADD COLUMN IF NOT EXISTS email VARCHAR(150) AFTER name,
                ADD COLUMN IF NOT EXISTS bio TEXT AFTER position,
                ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500) AFTER bio,
                ADD COLUMN IF NOT EXISTS photo_public_id VARCHAR(255) AFTER photo_url;
        `).catch(() => {});
        // Drop old user_id FK and column if they still exist (migration-safe)
        await connection.execute(`ALTER TABLE startup_members DROP FOREIGN KEY fk_member_user`).catch(() => {});
        await connection.execute(`ALTER TABLE startup_members DROP INDEX idx_member_user`).catch(() => {});
        await connection.execute(`ALTER TABLE startup_members DROP INDEX startup_members_startup_id_user_id`).catch(() => {});
        await connection.execute(`ALTER TABLE startup_members DROP COLUMN user_id`).catch(() => {});

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS startup_files (
                id INT AUTO_INCREMENT PRIMARY KEY,
                startup_id INT NOT NULL,
                file_type VARCHAR(50) NOT NULL,
                title VARCHAR(255),
                cloud_url VARCHAR(500) NOT NULL,
                public_id VARCHAR(255),
                resource_type VARCHAR(20) DEFAULT 'raw',
                mime_type VARCHAR(100),
                file_size BIGINT DEFAULT 0,
                original_filename VARCHAR(255),
                is_private TINYINT(1) DEFAULT 0,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_file_startup FOREIGN KEY(startup_id) REFERENCES startups(id) ON DELETE CASCADE ON UPDATE CASCADE,
                INDEX idx_file_startup(startup_id),
                INDEX idx_file_type(file_type)
            );
        `);

        // Add new columns to startup_files if they don't exist (migration-safe)
        await connection.execute(`
            ALTER TABLE startup_files
                ADD COLUMN IF NOT EXISTS resource_type VARCHAR(20) DEFAULT 'raw',
                ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
                ADD COLUMN IF NOT EXISTS is_private TINYINT(1) DEFAULT 0;
        `).catch(() => {}); // ignore if columns already exist

        // Add logo + registration certificate public_id columns to startups (migration-safe)
        await connection.execute(`
            ALTER TABLE startups
                ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500),
                ADD COLUMN IF NOT EXISTS logo_public_id VARCHAR(255),
                ADD COLUMN IF NOT EXISTS registration_certificate_public_id VARCHAR(255);
        `).catch(() => {}); // ignore if columns already exist

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS connections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                status VARCHAR(30) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_connection_sender FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_connection_receiver FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                UNIQUE(sender_id, receiver_id),
                INDEX idx_sender(sender_id),
                INDEX idx_receiver(receiver_id),
                INDEX idx_connection_status(status)
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                startup_id INT NULL,
                content TEXT NOT NULL,
                image_url VARCHAR(500),
                video_url VARCHAR(500),
                visibility VARCHAR(30) DEFAULT 'public',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_post_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_post_startup FOREIGN KEY(startup_id) REFERENCES startups(id) ON DELETE SET NULL ON UPDATE CASCADE,
                INDEX idx_post_user(user_id),
                INDEX idx_post_startup(startup_id),
                INDEX idx_visibility(visibility)
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS post_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_comment_post FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_comment_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                INDEX idx_comment_post(post_id),
                INDEX idx_comment_user(user_id)
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS post_likes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_like_post FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_like_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                UNIQUE(post_id, user_id),
                INDEX idx_like_post(post_id),
                INDEX idx_like_user(user_id)
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS conversations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type VARCHAR(30) DEFAULT 'private',
                title VARCHAR(255),
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_conversation_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
                INDEX idx_conversation_type(type)
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS conversation_participants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                conversation_id INT NOT NULL,
                user_id INT NOT NULL,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_cp_conversation FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_cp_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                UNIQUE(conversation_id, user_id),
                INDEX idx_cp_conversation(conversation_id),
                INDEX idx_cp_user(user_id)
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                conversation_id INT NOT NULL,
                sender_id INT NOT NULL,
                message TEXT,
                attachment_url VARCHAR(500),
                attachment_type VARCHAR(50),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_message_conversation FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_message_sender FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                INDEX idx_message_conversation(conversation_id),
                INDEX idx_message_sender(sender_id)
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS investments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                startup_id INT NOT NULL,
                investor_id INT NOT NULL,
                requested_amount DECIMAL(18,2) DEFAULT 0,
                offered_amount DECIMAL(18,2) DEFAULT 0,
                equity_percentage DECIMAL(5,2) DEFAULT 0,
                status VARCHAR(50) DEFAULT 'pending',
                agreement_url VARCHAR(500),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_investment_startup FOREIGN KEY(startup_id) REFERENCES startups(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_investment_investor FOREIGN KEY(investor_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                INDEX idx_investment_startup(startup_id),
                INDEX idx_investment_investor(investor_id),
                INDEX idx_investment_status(status)
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS verification_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                startup_id INT NULL,
                verification_type VARCHAR(50) NOT NULL,
                document_url VARCHAR(500),
                status VARCHAR(30) DEFAULT 'pending',
                remarks TEXT,
                verified_by INT NULL,
                verified_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_verification_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_verification_startup FOREIGN KEY(startup_id) REFERENCES startups(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_verification_admin FOREIGN KEY(verified_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
                INDEX idx_verification_user(user_id),
                INDEX idx_verification_startup(startup_id),
                INDEX idx_verification_status(status)
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT,
                type VARCHAR(50),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_notification_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                INDEX idx_notification_user(user_id),
                INDEX idx_notification_read(is_read)
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS saved_startups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                startup_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_saved_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_saved_startup FOREIGN KEY(startup_id) REFERENCES startups(id) ON DELETE CASCADE ON UPDATE CASCADE,
                UNIQUE(user_id,startup_id),
                INDEX idx_saved_user(user_id),
                INDEX idx_saved_startup(startup_id)
            );
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS startup_followers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                startup_id INT NOT NULL,
                user_id INT NOT NULL,
                followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_follow_startup FOREIGN KEY(startup_id) REFERENCES startups(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_follow_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                UNIQUE(startup_id,user_id),
                INDEX idx_follow_startup(startup_id),
                INDEX idx_follow_user(user_id)
            );
        `);

        console.log("✅ Database Schema Created Successfully");

        // ── New tables: reports + audit_logs ──────────────
        const Report   = require("../models/Report.model");
        const AuditLog = require("../models/AuditLog.model");
        await Report.ensureTable(connection);
        await AuditLog.ensureTable(connection);

        // ── messages: add reply_to_id for reply-to-message feature ──
        await connection.execute(`
            ALTER TABLE messages
                ADD COLUMN IF NOT EXISTS reply_to_id INT NULL DEFAULT NULL,
                ADD CONSTRAINT fk_reply_to FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL ON UPDATE CASCADE;
        `).catch(() => {}); // ignore if already exists

        // ── token_version column (migration-safe) ────────────────────────
        await connection.execute(
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0`
        ).catch(() => {});

        // ── Google OAuth columns (migration-safe) ────────────────────────
        await connection.execute(
            `ALTER TABLE users
               ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL UNIQUE,
               ADD COLUMN IF NOT EXISTS provider VARCHAR(30) NOT NULL DEFAULT 'local',
               ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(500) NULL`
        ).catch(() => {});
        await connection.execute(
            `ALTER TABLE users ADD INDEX IF NOT EXISTS idx_google_id (google_id)`
        ).catch(() => {});

        // ── FULLTEXT indexes for search (migration-safe) ───
        await connection.execute(
            `ALTER TABLE startups ADD FULLTEXT INDEX ft_startups (name, description, industry, problem, solution, mission, vision, business_model)`
        ).catch(() => {});
        await connection.execute(
            `ALTER TABLE profiles ADD FULLTEXT INDEX ft_profiles (first_name, last_name, headline, bio)`
        ).catch(() => {});
        await connection.execute(
            `ALTER TABLE posts ADD FULLTEXT INDEX ft_posts (content)`
        ).catch(() => {});

        // ── Performance indexes (migration-safe) ──────────
        const safeIndex = async (sql) => {
            await connection.execute(sql).catch(() => {});
        };

        // startups: composite indexes for discovery queries
        await safeIndex(`ALTER TABLE startups ADD INDEX idx_discover_status_verif (status, verification_status)`);
        await safeIndex(`ALTER TABLE startups ADD INDEX idx_discover_industry (industry)`);
        await safeIndex(`ALTER TABLE startups ADD INDEX idx_discover_country (country)`);
        await safeIndex(`ALTER TABLE startups ADD INDEX idx_discover_funding (funding_required)`);
        await safeIndex(`ALTER TABLE startups ADD INDEX idx_discover_created (created_at)`);

        // connections: composite for findByUser + status checks
        await safeIndex(`ALTER TABLE connections ADD INDEX idx_conn_sender_status (sender_id, status)`);
        await safeIndex(`ALTER TABLE connections ADD INDEX idx_conn_receiver_status (receiver_id, status)`);

        // posts: composite for feed queries
        await safeIndex(`ALTER TABLE posts ADD INDEX idx_post_visibility_created (visibility, created_at)`);
        await safeIndex(`ALTER TABLE posts ADD INDEX idx_post_startup_created (startup_id, created_at)`);

        // post_likes: lookup for toggle/count
        await safeIndex(`ALTER TABLE post_likes ADD INDEX idx_like_post_user (post_id, user_id)`);

        // post_comments: by post ordered
        await safeIndex(`ALTER TABLE post_comments ADD INDEX idx_comment_post_created (post_id, created_at)`);

        // notifications: unread count query
        await safeIndex(`ALTER TABLE notifications ADD INDEX idx_notif_user_read (user_id, is_read)`);

        // messages: unread count for inbox badge
        await safeIndex(`ALTER TABLE messages ADD INDEX idx_msg_conv_read (conversation_id, is_read)`);
        await safeIndex(`ALTER TABLE messages ADD INDEX idx_msg_sender (sender_id)`);
        // messages: conversation timeline for chat loading
        await safeIndex(`ALTER TABLE messages ADD INDEX idx_msg_conv_created (conversation_id, created_at)`);

        // conversation_participants: both directions needed for DM lookup
        await safeIndex(`ALTER TABLE conversation_participants ADD INDEX idx_cp_user_conv (user_id, conversation_id)`);

        // investments: status-based queries used by offers pages
        await safeIndex(`ALTER TABLE investments ADD INDEX idx_inv_startup_status (startup_id, status)`);
        await safeIndex(`ALTER TABLE investments ADD INDEX idx_inv_investor_status (investor_id, status)`);

        // saved_startups: user lookups
        await safeIndex(`ALTER TABLE saved_startups ADD INDEX idx_saved_user_created (user_id, created_at)`);

        // startup_followers: follower count + feed
        await safeIndex(`ALTER TABLE startup_followers ADD INDEX idx_follow_user_startup (user_id, startup_id)`);

        // ── post_tags: explicit people tagging in posts ──────────────────
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS post_tags (
                id      INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                CONSTRAINT fk_tag_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                CONSTRAINT fk_tag_user FOREIGN KEY (user_id) REFERENCES users(id)  ON DELETE CASCADE,
                UNIQUE (post_id, user_id),
                INDEX idx_tag_post (post_id),
                INDEX idx_tag_user (user_id)
            );
        `).catch(() => {});

        // ── startup_views: real view tracking ────────────────────────────
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS startup_views (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                startup_id INT NOT NULL,
                viewer_id  INT NULL,
                viewed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_view_startup FOREIGN KEY (startup_id) REFERENCES startups(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_view_user    FOREIGN KEY (viewer_id)  REFERENCES users(id)    ON DELETE SET NULL ON UPDATE CASCADE,
                INDEX idx_view_startup      (startup_id),
                INDEX idx_view_viewer       (viewer_id),
                INDEX idx_view_startup_date (startup_id, viewed_at)
            );
        `).catch(() => {});

        // ── investment_history: negotiation paper trail ───────────────────
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS investment_history (
                id                INT AUTO_INCREMENT PRIMARY KEY,
                investment_id     INT NOT NULL,
                proposed_by       INT NOT NULL,
                event_type        VARCHAR(50) NOT NULL,
                offered_amount    DECIMAL(18,2) DEFAULT NULL,
                equity_percentage DECIMAL(5,2)  DEFAULT NULL,
                notes             TEXT          DEFAULT NULL,
                created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_history_investment FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_history_proposer   FOREIGN KEY (proposed_by)   REFERENCES users(id)       ON DELETE CASCADE ON UPDATE CASCADE,
                INDEX idx_history_investment (investment_id),
                INDEX idx_history_created    (investment_id, created_at)
            );
        `).catch(() => {});

        console.log("✅ Performance Indexes Applied");

        // ════════════════════════════════════════════════════
        // CHAT v2 MIGRATIONS — extend existing tables, add new
        // All wrapped in .catch(() => {}) — safe to run repeatedly
        // ════════════════════════════════════════════════════

        // ── conversations: add context references + archiving ──
        await connection.execute(`
            ALTER TABLE conversations
                ADD COLUMN IF NOT EXISTS conv_type VARCHAR(50) DEFAULT 'private' COMMENT 'private|group|investment_negotiation|team|org|support',
                ADD COLUMN IF NOT EXISTS startup_id INT NULL,
                ADD COLUMN IF NOT EXISTS investment_id INT NULL,
                ADD COLUMN IF NOT EXISTS is_archived TINYINT(1) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS pinned_message_id INT NULL,
                ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP NULL;
        `).catch(() => {});

        // Add FKs for the new context columns (migration-safe)
        await connection.execute(`ALTER TABLE conversations ADD CONSTRAINT fk_conv_startup FOREIGN KEY (startup_id) REFERENCES startups(id) ON DELETE SET NULL`).catch(() => {});
        await connection.execute(`ALTER TABLE conversations ADD CONSTRAINT fk_conv_investment FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE SET NULL`).catch(() => {});

        // ── conversation_participants: role + mute + archive per user ──
        await connection.execute(`
            ALTER TABLE conversation_participants
                ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'member' COMMENT 'member|admin|observer',
                ADD COLUMN IF NOT EXISTS is_muted TINYINT(1) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS is_archived TINYINT(1) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP NULL;
        `).catch(() => {});

        // ── messages: edit/soft-delete/pin/reactions/attachments metadata ──
        await connection.execute(`
            ALTER TABLE messages
                ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP NULL,
                ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
                ADD COLUMN IF NOT EXISTS is_pinned TINYINT(1) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100) NULL,
                ADD COLUMN IF NOT EXISTS file_size BIGINT NULL,
                ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) NULL,
                ADD COLUMN IF NOT EXISTS public_id VARCHAR(255) NULL,
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent' COMMENT 'sent|delivered|read';
        `).catch(() => {});

        // ── message_reactions: emoji reactions ───────────────────────────
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS message_reactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message_id INT NOT NULL,
                user_id INT NOT NULL,
                emoji VARCHAR(10) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_reaction_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
                CONSTRAINT fk_reaction_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (message_id, user_id, emoji),
                INDEX idx_reaction_message (message_id),
                INDEX idx_reaction_user (user_id)
            );
        `).catch(() => {});

        // ── contact_requests: approve-before-message workflow ────────────
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS contact_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                startup_id INT NULL COMMENT 'context: which startup triggered this request',
                message VARCHAR(500) NULL COMMENT 'optional intro message from sender',
                status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending|accepted|declined',
                responded_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_cr_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_cr_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_cr_startup FOREIGN KEY (startup_id) REFERENCES startups(id) ON DELETE SET NULL,
                UNIQUE (sender_id, receiver_id),
                INDEX idx_cr_receiver (receiver_id),
                INDEX idx_cr_sender (sender_id),
                INDEX idx_cr_status (status)
            );
        `).catch(() => {});

        // ── blocked_users ─────────────────────────────────────────────────
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS blocked_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                blocker_id INT NOT NULL,
                blocked_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_block_blocker FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_block_blocked FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (blocker_id, blocked_id),
                INDEX idx_block_blocker (blocker_id)
            );
        `).catch(() => {});

        // ── Indexes for new chat columns ──────────────────────────────────
        await safeIndex(`ALTER TABLE conversations ADD INDEX idx_conv_startup (startup_id)`);
        await safeIndex(`ALTER TABLE conversations ADD INDEX idx_conv_investment (investment_id)`);
        await safeIndex(`ALTER TABLE conversations ADD INDEX idx_conv_activity (last_activity_at)`);
        await safeIndex(`ALTER TABLE messages ADD INDEX idx_msg_pinned (conversation_id, is_pinned)`);
        await safeIndex(`ALTER TABLE messages ADD INDEX idx_msg_deleted (deleted_at)`);

        console.log("✅ Chat v2 Schema Applied");

    } catch (error) {
        console.error("❌ Error Creating Schema:", error);
        throw error;
    }
}

module.exports = createTables;