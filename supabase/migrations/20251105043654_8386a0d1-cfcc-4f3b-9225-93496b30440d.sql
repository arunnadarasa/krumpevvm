-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Wallet owners can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Wallet owners can update profiles"
  ON public.profiles FOR UPDATE
  USING (true);

-- Create evvm_deployments table
CREATE TABLE IF NOT EXISTS public.evvm_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  evvm_id INTEGER,
  evvm_name TEXT NOT NULL,
  principal_token_name TEXT NOT NULL,
  principal_token_symbol TEXT NOT NULL,
  total_supply NUMERIC,
  host_chain_name TEXT NOT NULL,
  host_chain_id INTEGER NOT NULL,
  admin_address TEXT NOT NULL,
  golden_fisher_address TEXT NOT NULL,
  activator_address TEXT NOT NULL,
  name_service_address TEXT,
  evvm_core_address TEXT,
  staking_address TEXT,
  estimator_address TEXT,
  treasury_address TEXT,
  era_tokens NUMERIC,
  reward_per_operation NUMERIC,
  deployment_status TEXT DEFAULT 'pending',
  deployment_tx_hash TEXT,
  registry_tx_hash TEXT,
  deployment_logs JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.evvm_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view their own deployments"
  ON public.evvm_deployments FOR SELECT
  USING (true);

CREATE POLICY "Public can view completed deployments"
  ON public.evvm_deployments FOR SELECT
  USING (deployment_status = 'completed');

CREATE POLICY "Wallet owners can create deployments"
  ON public.evvm_deployments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Wallet owners can update their deployments"
  ON public.evvm_deployments FOR UPDATE
  USING (true);

-- Create story_nfts table
CREATE TABLE IF NOT EXISTS public.story_nfts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  evvm_deployment_id UUID NOT NULL,
  nft_name TEXT NOT NULL,
  story_network TEXT NOT NULL,
  transaction_hash TEXT,
  ip_asset_id TEXT,
  ipfs_uri TEXT,
  ipfs_gateway_url TEXT,
  metadata JSONB,
  minting_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.story_nfts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view NFTs"
  ON public.story_nfts FOR SELECT
  USING (true);

CREATE POLICY "Wallet owners can create NFTs"
  ON public.story_nfts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Wallet owners can update their NFTs"
  ON public.story_nfts FOR UPDATE
  USING (true);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_evvm_deployments_updated_at
  BEFORE UPDATE ON evvm_deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_story_nfts_updated_at
  BEFORE UPDATE ON story_nfts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();