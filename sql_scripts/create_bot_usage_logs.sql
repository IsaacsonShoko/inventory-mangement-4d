-- Create bot_usage_logs table for tracking Xlink-Sage bot analytics
-- This table stores all bot interactions for usage analysis and KPI dashboard

CREATE TABLE IF NOT EXISTS bot_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User information
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  user_email text,
  user_role text CHECK (user_role IN ('admin', 'back_office', 'user')),
  user_company text,
  user_warehouse text,

  -- Session tracking
  session_id text NOT NULL,

  -- Conversation data
  query text NOT NULL,
  response text NOT NULL,
  sources jsonb DEFAULT '[]'::jsonb,

  -- Performance metrics
  tokens_used integer,
  response_time_ms integer,

  -- Classification
  is_work_related boolean DEFAULT true,

  -- User feedback
  satisfaction_rating integer CHECK (satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_feedback text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  rated_at timestamptz
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bot_usage_logs_user_id ON bot_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_usage_logs_session_id ON bot_usage_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_bot_usage_logs_created_at ON bot_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_usage_logs_user_role ON bot_usage_logs(user_role);
CREATE INDEX IF NOT EXISTS idx_bot_usage_logs_satisfaction ON bot_usage_logs(satisfaction_rating) WHERE satisfaction_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bot_usage_logs_work_related ON bot_usage_logs(is_work_related);

-- Add RLS (Row Level Security) policies
ALTER TABLE bot_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own logs
CREATE POLICY "Users can view own bot logs"
  ON bot_usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own logs
CREATE POLICY "Users can insert own bot logs"
  ON bot_usage_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own ratings
CREATE POLICY "Users can rate own bot responses"
  ON bot_usage_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view all bot logs"
  ON bot_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: Back office and admins can view aggregated data
CREATE POLICY "Back office can view all bot logs"
  ON bot_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- Add helpful comments
COMMENT ON TABLE bot_usage_logs IS 'Tracks all Xlink-Sage bot interactions for analytics and improvement';
COMMENT ON COLUMN bot_usage_logs.user_id IS 'Foreign key to user_profiles, nullable for anonymous users';
COMMENT ON COLUMN bot_usage_logs.session_id IS 'Unique session identifier from client';
COMMENT ON COLUMN bot_usage_logs.query IS 'User question or input';
COMMENT ON COLUMN bot_usage_logs.response IS 'Bot response text';
COMMENT ON COLUMN bot_usage_logs.sources IS 'JSON array of knowledge base sources used';
COMMENT ON COLUMN bot_usage_logs.tokens_used IS 'Total tokens consumed (embedding + chat)';
COMMENT ON COLUMN bot_usage_logs.response_time_ms IS 'Total response time in milliseconds';
COMMENT ON COLUMN bot_usage_logs.is_work_related IS 'Whether query was work-related (manual classification)';
COMMENT ON COLUMN bot_usage_logs.satisfaction_rating IS '1-5 star rating from user';
COMMENT ON COLUMN bot_usage_logs.satisfaction_feedback IS 'Optional text feedback from user';
COMMENT ON COLUMN bot_usage_logs.rated_at IS 'Timestamp when user rated the response';
