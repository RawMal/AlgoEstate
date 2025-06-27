/*
  # Platform Database Schema

  1. New Tables
    - `properties`
      - `id` (uuid, primary key)
      - `name` (text, property name)
      - `address` (jsonb, property address details)
      - `total_value` (decimal, total property value)
      - `token_price` (decimal, price per token)
      - `total_tokens` (int, total tokens available, default 10000)
      - `available_tokens` (int, tokens still available for purchase)
      - `asa_id` (bigint, Algorand Standard Asset ID)
      - `metadata_url` (text, URL to property metadata)
      - `created_at` (timestamptz, creation timestamp)

    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique user email)
      - `wallet_address` (text, Algorand wallet address)
      - `kyc_status` (text, KYC verification status)
      - `created_at` (timestamptz, creation timestamp)

    - `token_ownership`
      - `id` (uuid, primary key)
      - `property_id` (uuid, foreign key to properties)
      - `user_id` (uuid, foreign key to users)
      - `wallet_address` (text, owner's wallet address)
      - `token_amount` (int, number of tokens owned)
      - `purchase_date` (timestamptz, purchase timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read/write their own data
    - Add policies for public read access to properties
    - Add policies for secure token ownership tracking
*/

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address jsonb NOT NULL,
  total_value decimal NOT NULL CHECK (total_value > 0),
  token_price decimal NOT NULL CHECK (token_price > 0),
  total_tokens int DEFAULT 10000 CHECK (total_tokens > 0),
  available_tokens int NOT NULL CHECK (available_tokens >= 0),
  asa_id bigint UNIQUE,
  metadata_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT available_tokens_check CHECK (available_tokens <= total_tokens)
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  wallet_address text UNIQUE,
  kyc_status text DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- Create token ownership table
CREATE TABLE IF NOT EXISTS token_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  token_amount int NOT NULL CHECK (token_amount > 0),
  purchase_date timestamptz DEFAULT now(),
  UNIQUE(property_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_asa_id ON properties(asa_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_token_ownership_property_id ON token_ownership(property_id);
CREATE INDEX IF NOT EXISTS idx_token_ownership_user_id ON token_ownership(user_id);
CREATE INDEX IF NOT EXISTS idx_token_ownership_wallet_address ON token_ownership(wallet_address);

-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_ownership ENABLE ROW LEVEL SECURITY;

-- Properties policies (public read access)
CREATE POLICY "Properties are viewable by everyone"
  ON properties
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only authenticated users can insert properties"
  ON properties
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can update properties"
  ON properties
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Users policies (users can only access their own data)
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text OR email = auth.email());

CREATE POLICY "Users can insert their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text OR email = auth.email());

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text OR email = auth.email())
  WITH CHECK (auth.uid()::text = id::text OR email = auth.email());

-- Token ownership policies
CREATE POLICY "Users can view all token ownership records"
  ON token_ownership
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own token ownership"
  ON token_ownership
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = token_ownership.user_id 
      AND (users.id::text = auth.uid()::text OR users.email = auth.email())
    )
  );

CREATE POLICY "Users can update their own token ownership"
  ON token_ownership
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = token_ownership.user_id 
      AND (users.id::text = auth.uid()::text OR users.email = auth.email())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = token_ownership.user_id 
      AND (users.id::text = auth.uid()::text OR users.email = auth.email())
    )
  );

-- Function to automatically update available_tokens when tokens are purchased
CREATE OR REPLACE FUNCTION update_available_tokens()
RETURNS TRIGGER AS $$
BEGIN
  -- Update available tokens when new ownership is created
  IF TG_OP = 'INSERT' THEN
    UPDATE properties 
    SET available_tokens = available_tokens - NEW.token_amount
    WHERE id = NEW.property_id;
    
    -- Check if we have enough tokens available
    IF (SELECT available_tokens FROM properties WHERE id = NEW.property_id) < 0 THEN
      RAISE EXCEPTION 'Not enough tokens available for purchase';
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Update available tokens when ownership is updated
  IF TG_OP = 'UPDATE' THEN
    UPDATE properties 
    SET available_tokens = available_tokens + OLD.token_amount - NEW.token_amount
    WHERE id = NEW.property_id;
    
    -- Check if we have enough tokens available
    IF (SELECT available_tokens FROM properties WHERE id = NEW.property_id) < 0 THEN
      RAISE EXCEPTION 'Not enough tokens available for purchase';
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Update available tokens when ownership is deleted
  IF TG_OP = 'DELETE' THEN
    UPDATE properties 
    SET available_tokens = available_tokens + OLD.token_amount
    WHERE id = OLD.property_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update available tokens
CREATE TRIGGER trigger_update_available_tokens
  AFTER INSERT OR UPDATE OR DELETE ON token_ownership
  FOR EACH ROW
  EXECUTE FUNCTION update_available_tokens();

-- Function to get user portfolio summary
CREATE OR REPLACE FUNCTION get_user_portfolio(user_wallet_address text)
RETURNS TABLE (
  property_id uuid,
  property_name text,
  property_address jsonb,
  token_amount int,
  token_price decimal,
  current_value decimal,
  purchase_date timestamptz,
  asa_id bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.address,
    to_.token_amount,
    p.token_price,
    (to_.token_amount * p.token_price) as current_value,
    to_.purchase_date,
    p.asa_id
  FROM token_ownership to_
  JOIN properties p ON p.id = to_.property_id
  WHERE to_.wallet_address = user_wallet_address
  ORDER BY to_.purchase_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get property investment summary
CREATE OR REPLACE FUNCTION get_property_investments(property_uuid uuid)
RETURNS TABLE (
  investor_wallet text,
  token_amount int,
  investment_value decimal,
  purchase_date timestamptz,
  percentage_owned decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_.wallet_address,
    to_.token_amount,
    (to_.token_amount * p.token_price) as investment_value,
    to_.purchase_date,
    (to_.token_amount::decimal / p.total_tokens::decimal * 100) as percentage_owned
  FROM token_ownership to_
  JOIN properties p ON p.id = to_.property_id
  WHERE to_.property_id = property_uuid
  ORDER BY to_.token_amount DESC;
END;
$$ LANGUAGE plpgsql;