/*
  # Fix KYC Applications RLS Policy

  1. Security Updates
    - Update INSERT policy for kyc_applications to properly check authenticated user's email
    - Ensure the policy allows users to create KYC applications with their own email
    - Fix the policy condition to use auth.email() function correctly

  2. Changes
    - Drop existing INSERT policy that was causing violations
    - Create new INSERT policy with proper email validation
    - Ensure authenticated users can only create applications with their own email
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own KYC applications" ON kyc_applications;

-- Create a new INSERT policy that properly validates the user's email
CREATE POLICY "Users can insert their own KYC applications"
  ON kyc_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (email = auth.email());

-- Also update the SELECT policy to be more consistent
DROP POLICY IF EXISTS "Users can view their own KYC applications" ON kyc_applications;

CREATE POLICY "Users can view their own KYC applications"
  ON kyc_applications
  FOR SELECT
  TO authenticated
  USING (email = auth.email());

-- Update the UPDATE policy to be consistent
DROP POLICY IF EXISTS "Users can update their own KYC applications" ON kyc_applications;

CREATE POLICY "Users can update their own KYC applications"
  ON kyc_applications
  FOR UPDATE
  TO authenticated
  USING (email = auth.email())
  WITH CHECK (email = auth.email());