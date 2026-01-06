-- ============================================
-- ファイル管理システム データベーススキーマ
-- MySQL 8.0+
-- ============================================

-- 文字セット設定
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- データベース作成（必要に応じて）
-- CREATE DATABASE IF NOT EXISTS filemanager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE filemanager;

-- ============================================
-- 営業所テーブル（Branch Offices）
-- ============================================
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,              -- 営業所コード（例：TKY, OSK, NGO）
    address VARCHAR(500),
    phone VARCHAR(50),
    manager_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_branches_code (code),
    INDEX idx_branches_active (is_active),
    INDEX idx_branches_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 部署テーブル（Departments）
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36),                -- 所属営業所（NULL可 = 全社共通部署）
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),                     -- 部署コード（例：SALES, DEV, HR）
    parent_id VARCHAR(36),                -- 親部署（階層構造対応）
    description TEXT,
    manager_id VARCHAR(36),               -- 部署長
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
    INDEX idx_departments_branch (branch_id),
    INDEX idx_departments_code (code),
    INDEX idx_departments_parent (parent_id),
    INDEX idx_departments_active (is_active),
    INDEX idx_departments_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ユーザーテーブル
-- ============================================
-- 権限階層: super_admin > branch_admin > department_admin > user
-- super_admin: 全権管理者（システム全体）
-- branch_admin: 営業所管理者（自営業所のユーザー・フォルダ）
-- department_admin: 部署管理者（自部署のユーザー・フォルダ）
-- user: 一般ユーザー（権限付与されたフォルダのみ）
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'branch_admin', 'department_admin', 'user') DEFAULT 'user',
    branch_id VARCHAR(36),                -- 所属営業所
    department_id VARCHAR(36),            -- 所属部署
    position VARCHAR(100),                -- 役職
    employee_code VARCHAR(50),            -- 社員番号
    avatar_path VARCHAR(500),
    storage_quota BIGINT DEFAULT 1073741824,  -- 1GB
    storage_used BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    failed_attempts INT DEFAULT 0,
    locked_until DATETIME,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_branch (branch_id),
    INDEX idx_users_department (department_id),
    INDEX idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- フォルダテーブル（階層対応）
-- ============================================
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id VARCHAR(36),
    path VARCHAR(1000),
    created_by VARCHAR(36) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_folders_parent (parent_id),
    INDEX idx_folders_path (path(255)),
    INDEX idx_folders_created_by (created_by),
    INDEX idx_folders_deleted (is_deleted, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- フォルダ権限テーブル（ユーザー単位）
-- ============================================
CREATE TABLE IF NOT EXISTS folder_permissions (
    id VARCHAR(36) PRIMARY KEY,
    folder_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    permission_level ENUM('view', 'edit', 'manage') DEFAULT 'view',
    granted_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_folder_user (folder_id, user_id),
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id),
    INDEX idx_permissions_user (user_id),
    INDEX idx_permissions_folder (folder_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- フォルダ権限テーブル（営業所単位）
-- ============================================
CREATE TABLE IF NOT EXISTS folder_branch_permissions (
    id VARCHAR(36) PRIMARY KEY,
    folder_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36) NOT NULL,
    permission_level ENUM('view', 'edit', 'manage') DEFAULT 'view',
    granted_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_folder_branch (folder_id, branch_id),
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id),
    INDEX idx_branch_perm_folder (folder_id),
    INDEX idx_branch_perm_branch (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- フォルダ権限テーブル（部署単位）
-- ============================================
CREATE TABLE IF NOT EXISTS folder_department_permissions (
    id VARCHAR(36) PRIMARY KEY,
    folder_id VARCHAR(36) NOT NULL,
    department_id VARCHAR(36) NOT NULL,
    permission_level ENUM('view', 'edit', 'manage') DEFAULT 'view',
    granted_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_folder_department (folder_id, department_id),
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id),
    INDEX idx_dept_perm_folder (folder_id),
    INDEX idx_dept_perm_department (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ファイルテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS files (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    type VARCHAR(100),
    extension VARCHAR(20),
    size BIGINT DEFAULT 0,
    folder_id VARCHAR(36) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    storage_path VARCHAR(500),
    thumbnail_path VARCHAR(500),
    version INT DEFAULT 1,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_files_folder (folder_id),
    INDEX idx_files_created_by (created_by),
    INDEX idx_files_deleted (is_deleted, deleted_at),
    INDEX idx_files_type (type),
    INDEX idx_files_extension (extension),
    FULLTEXT INDEX idx_files_name (name, original_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ファイルバージョン履歴テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS file_versions (
    id VARCHAR(36) PRIMARY KEY,
    file_id VARCHAR(36) NOT NULL,
    version_number INT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    size BIGINT DEFAULT 0,
    created_by VARCHAR(36),
    comment TEXT,
    is_current BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_versions_file (file_id),
    INDEX idx_versions_file_version (file_id, version_number),
    INDEX idx_versions_current (file_id, is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 共有リンクテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS share_links (
    id VARCHAR(36) PRIMARY KEY,
    token VARCHAR(100) UNIQUE NOT NULL,
    resource_type ENUM('file', 'folder') NOT NULL,
    resource_id VARCHAR(36) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    password_hash VARCHAR(255),
    expires_at DATETIME,
    download_count INT DEFAULT 0,
    max_downloads INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_share_token (token),
    INDEX idx_share_resource (resource_type, resource_id),
    INDEX idx_share_expires (expires_at),
    INDEX idx_share_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- お気に入りテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    resource_type ENUM('file', 'folder') NOT NULL,
    resource_id VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_resource (user_id, resource_type, resource_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_favorites_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 最近使用したファイルテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS recent_files (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    file_id VARCHAR(36) NOT NULL,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_file (user_id, file_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    INDEX idx_recent_user (user_id),
    INDEX idx_recent_accessed (accessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- アクティビティログテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    action ENUM(
        'login', 'logout', 'upload', 'download', 'delete', 'restore',
        'create_folder', 'rename', 'move', 'share', 'permission_change',
        'version_create', 'version_restore', 'favorite_add', 'favorite_remove',
        'create_user', 'update_user', 'delete_user'
    ) NOT NULL,
    resource_type ENUM('file', 'folder', 'user', 'system'),
    resource_id VARCHAR(36),
    resource_name VARCHAR(255),
    details JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_activity_user (user_id, created_at),
    INDEX idx_activity_resource (resource_type, resource_id),
    INDEX idx_activity_action (action),
    INDEX idx_activity_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- セッションテーブル（オプション：JWT以外の場合）
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(500) NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_token (token(255)),
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- パスワードリセットトークンテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS password_resets (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(100) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_resets_token (token),
    INDEX idx_resets_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
