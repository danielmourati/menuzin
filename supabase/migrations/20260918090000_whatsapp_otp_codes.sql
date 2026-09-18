-- Tabela de Códigos OTP para Validação de WhatsApp do Lojista
CREATE TABLE IF NOT EXISTS public.whatsapp_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para buscas por telefone
CREATE INDEX IF NOT EXISTS idx_otp_whatsapp ON public.whatsapp_otp_codes(whatsapp);

-- Adicionar coluna whatsapp_verified no tenant se não existir
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN NOT NULL DEFAULT false;

-- RLS para tabela de códigos OTP
ALTER TABLE public.whatsapp_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura e escrita de OTPs" ON public.whatsapp_otp_codes
  FOR ALL USING (true);
