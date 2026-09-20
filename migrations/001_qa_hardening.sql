-- BizKit production QA hardening, 2026-09-20
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'pcs';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reversal_note TEXT;

CREATE INDEX IF NOT EXISTS idx_activity_user_id ON public.activity(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON public.quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id ON public.stock_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_user_id ON public.invoices(customer_id,user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_user_id ON public.payments(invoice_id,user_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_user_id ON public.payments(customer_id,user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_user_id ON public.stock_movements(product_id,user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_user_invoice_no ON public.invoices(user_id,invoice_no);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quotations_user_quote_no ON public.quotations(user_id,quote_no);
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchases_user_purchase_no ON public.purchases(user_id,purchase_no);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_price_nonnegative;
ALTER TABLE public.products ADD CONSTRAINT products_price_nonnegative CHECK (price >= 0);
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_purchase_price_nonnegative;
ALTER TABLE public.products ADD CONSTRAINT products_purchase_price_nonnegative CHECK (purchase_price >= 0);
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_gst_rate_valid;
ALTER TABLE public.products ADD CONSTRAINT products_gst_rate_valid CHECK (gst_rate >= 0 AND gst_rate <= 100);
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_stock_nonnegative;
ALTER TABLE public.products ADD CONSTRAINT products_stock_nonnegative CHECK (stock >= 0);
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_low_stock_threshold_nonnegative;
ALTER TABLE public.products ADD CONSTRAINT products_low_stock_threshold_nonnegative CHECK (low_stock_threshold >= 0);

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_financials_valid;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_financials_valid CHECK (gst_rate >= 0 AND gst_rate <= 100 AND discount >= 0 AND subtotal >= 0 AND gst_amount >= 0 AND total >= 0);
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_valid;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_valid CHECK (status IN ('unpaid','partial','paid','overdue','cancelled'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_amount_positive;
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_amount_positive;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0);

ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_status_valid;
ALTER TABLE public.quotations ADD CONSTRAINT quotations_status_valid CHECK (status IN ('draft','sent','accepted','rejected','expired'));
ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_status_valid;
ALTER TABLE public.purchases ADD CONSTRAINT purchases_status_valid CHECK (status IN ('received','cancelled'));

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
