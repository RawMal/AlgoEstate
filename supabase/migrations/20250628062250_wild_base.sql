/*
  # Real Estate Tokenization Platform Schema

  1. New Tables
    - `properties` - Store property information and tokenization details
    - `users` - User profiles with KYC status and wallet addresses
    - `token_ownership` - Track token ownership and purchases
    - `kyc_applications` - KYC verification applications
    - `kyc_documents` - Document uploads for KYC verification

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for data access
    - Ensure users can only access their own data

  3. Functions
    - Portfolio aggregation functions
    - Token ownership tracking
    - Automatic token availability updates

  4. Triggers
    - Update available tokens when ownership changes
    - Maintain data consistency
*/

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address jsonb NOT NULL DEFAULT '{}',
  total_value numeric NOT NULL CHECK (total_value > 0),
  token_price numeric NOT NULL CHECK (token_price > 0),
  total_tokens integer NOT NULL DEFAULT 10000 CHECK (total_tokens > 0),
  available_tokens integer NOT NULL CHECK (available_tokens >= 0),
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

-- Create token_ownership table
CREATE TABLE IF NOT EXISTS token_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  token_amount integer NOT NULL CHECK (token_amount > 0),
  purchase_date timestamptz DEFAULT now(),
  UNIQUE(property_id, user_id)
);

-- Create KYC applications table
CREATE TABLE IF NOT EXISTS kyc_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  phone_number text NOT NULL,
  email text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  tier integer DEFAULT 1 CHECK (tier IN (1, 2, 3)),
  investment_limit numeric DEFAULT 5000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  rejection_reason text
);

-- Create KYC documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES kyc_applications(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('national_id', 'proof_of_address')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  uploaded_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  rejection_reason text
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_asa_id ON properties(asa_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_token_ownership_property_id ON token_ownership(property_id);
CREATE INDEX IF NOT EXISTS idx_token_ownership_user_id ON token_ownership(user_id);
CREATE INDEX IF NOT EXISTS idx_token_ownership_wallet_address ON token_ownership(wallet_address);

-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
    -- Properties policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Properties are viewable by everyone' AND tablename = 'properties') THEN
        DROP POLICY "Properties are viewable by everyone" ON properties;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only authenticated users can insert properties' AND tablename = 'properties') THEN
        DROP POLICY "Only authenticated users can insert properties" ON properties;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only authenticated users can update properties' AND tablename = 'properties') THEN
        DROP POLICY "Only authenticated users can update properties" ON properties;
    END IF;
    
    -- Users policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own profile' AND tablename = 'users') THEN
        DROP POLICY "Users can view their own profile" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own profile' AND tablename = 'users') THEN
        DROP POLICY "Users can insert their own profile" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile' AND tablename = 'users') THEN
        DROP POLICY "Users can update their own profile" ON users;
    END IF;
    
    -- Token ownership policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all token ownership records' AND tablename = 'token_ownership') THEN
        DROP POLICY "Users can view all token ownership records" ON token_ownership;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own token ownership' AND tablename = 'token_ownership') THEN
        DROP POLICY "Users can insert their own token ownership" ON token_ownership;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own token ownership' AND tablename = 'token_ownership') THEN
        DROP POLICY "Users can update their own token ownership" ON token_ownership;
    END IF;
    
    -- KYC applications policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own KYC applications' AND tablename = 'kyc_applications') THEN
        DROP POLICY "Users can view their own KYC applications" ON kyc_applications;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own KYC applications' AND tablename = 'kyc_applications') THEN
        DROP POLICY "Users can insert their own KYC applications" ON kyc_applications;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own KYC applications' AND tablename = 'kyc_applications') THEN
        DROP POLICY "Users can update their own KYC applications" ON kyc_applications;
    END IF;
    
    -- KYC documents policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own KYC documents' AND tablename = 'kyc_documents') THEN
        DROP POLICY "Users can view their own KYC documents" ON kyc_documents;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own KYC documents' AND tablename = 'kyc_documents') THEN
        DROP POLICY "Users can insert their own KYC documents" ON kyc_documents;
    END IF;
END
$$;

-- Properties policies (public read, authenticated insert/update)
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

-- KYC applications policies
CREATE POLICY "Users can view their own KYC applications"
  ON kyc_applications
  FOR SELECT
  TO authenticated
  USING (wallet_address = auth.jwt() ->> 'wallet_address' OR email = auth.email());

CREATE POLICY "Users can insert their own KYC applications"
  ON kyc_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (email = auth.email());

CREATE POLICY "Users can update their own KYC applications"
  ON kyc_applications
  FOR UPDATE
  TO authenticated
  USING (email = auth.email())
  WITH CHECK (email = auth.email());

-- KYC documents policies
CREATE POLICY "Users can view their own KYC documents"
  ON kyc_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_applications 
      WHERE kyc_applications.id = kyc_documents.application_id 
      AND kyc_applications.email = auth.email()
    )
  );

CREATE POLICY "Users can insert their own KYC documents"
  ON kyc_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_applications 
      WHERE kyc_applications.id = kyc_documents.application_id 
      AND kyc_applications.email = auth.email()
    )
  );

-- Function to update available tokens when ownership changes
CREATE OR REPLACE FUNCTION update_available_tokens()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE properties 
    SET available_tokens = available_tokens - NEW.token_amount
    WHERE id = NEW.property_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE properties 
    SET available_tokens = available_tokens + OLD.token_amount - NEW.token_amount
    WHERE id = NEW.property_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE properties 
    SET available_tokens = available_tokens + OLD.token_amount
    WHERE id = OLD.property_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic token availability updates
DROP TRIGGER IF EXISTS trigger_update_available_tokens ON token_ownership;
CREATE TRIGGER trigger_update_available_tokens
  AFTER INSERT OR UPDATE OR DELETE ON token_ownership
  FOR EACH ROW EXECUTE FUNCTION update_available_tokens();

-- Function to get user portfolio with detailed information
CREATE OR REPLACE FUNCTION get_user_portfolio(user_wallet_address text)
RETURNS TABLE (
  property_id uuid,
  property_name text,
  property_address jsonb,
  token_amount integer,
  token_price numeric,
  current_value numeric,
  purchase_date timestamptz,
  asa_id bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as property_id,
    p.name as property_name,
    p.address as property_address,
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

-- Function to get detailed user portfolio (extended version)
CREATE OR REPLACE FUNCTION get_user_portfolio_detailed(user_wallet_address text)
RETURNS TABLE (
  property_id uuid,
  property_name text,
  property_location text,
  property_image text,
  property_type text,
  token_amount integer,
  token_price numeric,
  current_value numeric,
  purchase_value numeric,
  purchase_date timestamptz,
  expected_yield numeric,
  last_dividend numeric,
  asa_id bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as property_id,
    p.name as property_name,
    COALESCE(p.address->>'city', 'Unknown') as property_location,
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' as property_image,
    COALESCE(p.address->>'property_type', 'residential') as property_type,
    to_.token_amount,
    p.token_price,
    (to_.token_amount * p.token_price) as current_value,
    (to_.token_amount * p.token_price) as purchase_value, -- Simplified for demo
    to_.purchase_date,
    8.0::numeric as expected_yield, -- Default yield
    (to_.token_amount * 0.5) as last_dividend, -- Mock dividend calculation
    p.asa_id
  FROM token_ownership to_
  JOIN properties p ON p.id = to_.property_id
  WHERE to_.wallet_address = user_wallet_address
  ORDER BY to_.purchase_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Insert sample properties for testing (only if they don't already exist)
DO $$
BEGIN
  -- Check if properties table is empty before inserting sample data
  IF NOT EXISTS (SELECT 1 FROM properties LIMIT 1) THEN
    INSERT INTO properties (name, address, total_value, token_price, total_tokens, available_tokens) VALUES
    (
      'Luxury Manhattan Penthouse',
      '{"street": "123 Park Avenue", "city": "New York", "state": "NY", "country": "United States", "zipCode": "10016", "property_type": "residential"}',
      2500000,
      250,
      10000,
      6500
    ),
    (
      'Modern Miami Condo',
      '{"street": "456 Ocean Drive", "city": "Miami", "state": "FL", "country": "United States", "zipCode": "33139", "property_type": "residential"}',
      1800000,
      180,
      10000,
      7500
    ),
    (
      'Downtown Austin Office',
      '{"street": "789 Congress Avenue", "city": "Austin", "state": "TX", "country": "United States", "zipCode": "78701", "property_type": "commercial"}',
      3200000,
      320,
      10000,
      8500
    ),
    (
      'Seattle Tech Hub',
      '{"street": "321 Pine Street", "city": "Seattle", "state": "WA", "country": "United States", "zipCode": "98101", "property_type": "commercial"}',
      2800000,
      280,
      10000,
      9200
    ),
    (
      'Chicago Luxury Apartment',
      '{"street": "654 Michigan Avenue", "city": "Chicago", "state": "IL", "country": "United States", "zipCode": "60611", "property_type": "residential"}',
      2100000,
      210,
      10000,
      7800
    );
  END IF;
END $$;