/*
  # Initial schema setup for file management system

  1. Tables
    - users
      - id (text, primary key) - matches auth.users.email
      - name (text)
      - role (text)
      - created_at (timestamp)
    
    - folders
      - id (uuid, primary key)
      - name (text)
      - created_by (text, references users.id)
      - created_at (timestamp)
    
    - folder_permissions
      - id (uuid, primary key)
      - folder_id (uuid, references folders.id)
      - user_id (text, references users.id)
      - created_at (timestamp)
    
    - files
      - id (uuid, primary key)
      - name (text)
      - type (text)
      - size (bigint)
      - folder_id (uuid, references folders.id)
      - created_by (text, references users.id)
      - storage_path (text)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Users table
CREATE TABLE users (
  id text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Folders table
CREATE TABLE folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by text REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read folders they have permission for"
  ON folders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM folder_permissions
      WHERE folder_id = folders.id
      AND user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create folders"
  ON folders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own folders"
  ON folders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Folder permissions table
CREATE TABLE folder_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(folder_id, user_id)
);

ALTER TABLE folder_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read folder permissions"
  ON folder_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage permissions for their folders"
  ON folder_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM folders
      WHERE id = folder_permissions.folder_id
      AND created_by = auth.uid()
    )
  );

-- Files table
CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  folder_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  created_by text REFERENCES users(id),
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read files in folders they have permission for"
  ON files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM folder_permissions
      WHERE folder_id = files.folder_id
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM folders
      WHERE id = files.folder_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can upload files to folders they have permission for"
  ON files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM folder_permissions
      WHERE folder_id = files.folder_id
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM folders
      WHERE id = files.folder_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own files"
  ON files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create indexes for better performance
CREATE INDEX idx_folder_permissions_folder_id ON folder_permissions(folder_id);
CREATE INDEX idx_folder_permissions_user_id ON folder_permissions(user_id);
CREATE INDEX idx_files_folder_id ON files(folder_id);
CREATE INDEX idx_files_created_by ON files(created_by);