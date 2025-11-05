-- Add set_evvm_id_tx_hash column to track EVVM ID configuration transaction
ALTER TABLE evvm_deployments 
ADD COLUMN set_evvm_id_tx_hash TEXT;