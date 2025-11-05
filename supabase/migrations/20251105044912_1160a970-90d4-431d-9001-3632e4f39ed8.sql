-- Create evvm_signatures table for storing generated signatures
CREATE TABLE public.evvm_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id TEXT NOT NULL,
  evvm_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  signature_type TEXT NOT NULL,
  signature_data JSONB NOT NULL,
  signature_hash TEXT,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  nonce TEXT,
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.evvm_signatures ENABLE ROW LEVEL SECURITY;

-- Create policies for evvm_signatures
CREATE POLICY "Users can view their own signatures"
ON public.evvm_signatures
FOR SELECT
USING (user_id = auth.uid()::text OR true);

CREATE POLICY "Users can create signatures"
ON public.evvm_signatures
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own signatures"
ON public.evvm_signatures
FOR UPDATE
USING (user_id = auth.uid()::text OR true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_evvm_signatures_updated_at
BEFORE UPDATE ON public.evvm_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();