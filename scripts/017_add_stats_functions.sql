-- Migration: Add database functions for efficient stats calculation
-- This eliminates the need for row limits by doing aggregation in the database

-- Function to get dashboard stats with proper aggregation
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  total_revenue numeric,
  total_sales bigint,
  total_debtors numeric,
  total_profit numeric,
  cash_sales numeric,
  mpesa_sales numeric,
  top_product_name text,
  top_product_quantity bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH completed_sales AS (
    SELECT
      s.id,
      s.total_amount,
      s.payment_method,
      s.created_at
    FROM sales s
    WHERE s.status = 'completed'
      AND (start_date IS NULL OR s.created_at >= start_date)
      AND (end_date IS NULL OR s.created_at <= end_date)
  ),
  sales_aggregates AS (
    SELECT
      COUNT(*) as sale_count,
      COALESCE(SUM(total_amount), 0) as revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_total,
      COALESCE(SUM(CASE WHEN payment_method = 'mpesa' THEN total_amount ELSE 0 END), 0) as mpesa_total
    FROM completed_sales
  ),
  profit_calc AS (
    SELECT
      COALESCE(SUM((si.unit_price - p.cost_price) * si.quantity), 0) as total_profit_calc
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN completed_sales cs ON si.sale_id = cs.id
  ),
  top_product AS (
    SELECT
      p.name as product_name,
      SUM(si.quantity) as total_quantity
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN completed_sales cs ON si.sale_id = cs.id
    GROUP BY p.name
    ORDER BY total_quantity DESC
    LIMIT 1
  ),
  debtor_total AS (
    SELECT COALESCE(SUM(amount), 0) as total_debt
    FROM debtors
    WHERE status != 'paid'
  )
  SELECT
    sa.revenue,
    sa.sale_count,
    dt.total_debt,
    pc.total_profit_calc,
    sa.cash_total,
    sa.mpesa_total,
    COALESCE(tp.product_name, 'No sales'),
    COALESCE(tp.total_quantity, 0)
  FROM sales_aggregates sa
  CROSS JOIN profit_calc pc
  CROSS JOIN debtor_total dt
  LEFT JOIN top_product tp ON true;
END;
$$;

-- Function to get report stats with proper aggregation
CREATE OR REPLACE FUNCTION get_report_stats(
  start_date timestamptz,
  end_date timestamptz
)
RETURNS TABLE (
  total_revenue numeric,
  total_sales bigint,
  gross_profit numeric,
  total_cost numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH completed_sales AS (
    SELECT
      s.id,
      s.total_amount,
      s.created_at
    FROM sales s
    WHERE s.status = 'completed'
      AND s.created_at >= start_date
      AND s.created_at <= end_date
  ),
  revenue_and_cost AS (
    SELECT
      COALESCE(SUM(cs.total_amount), 0) as revenue,
      COUNT(DISTINCT cs.id) as sale_count,
      COALESCE(SUM(si.quantity * p.cost_price), 0) as cost
    FROM completed_sales cs
    LEFT JOIN sale_items si ON cs.id = si.sale_id
    LEFT JOIN products p ON si.product_id = p.id
  )
  SELECT
    revenue,
    sale_count,
    revenue - cost as profit,
    cost
  FROM revenue_and_cost;
END;
$$;

-- Function to get sales by date range (for charts) with aggregation
CREATE OR REPLACE FUNCTION get_sales_by_date(
  start_date timestamptz,
  end_date timestamptz
)
RETURNS TABLE (
  sale_date date,
  daily_revenue numeric,
  daily_profit numeric,
  sale_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(s.created_at) as sale_date,
    COALESCE(SUM(s.total_amount), 0) as daily_revenue,
    COALESCE(SUM((si.unit_price - p.cost_price) * si.quantity), 0) as daily_profit,
    COUNT(DISTINCT s.id) as sale_count
  FROM sales s
  LEFT JOIN sale_items si ON s.sale_id = si.sale_id
  LEFT JOIN products p ON si.product_id = p.id
  WHERE s.status = 'completed'
    AND s.created_at >= start_date
    AND s.created_at <= end_date
  GROUP BY DATE(s.created_at)
  ORDER BY sale_date;
END;
$$;

-- Function to get top products with aggregation
CREATE OR REPLACE FUNCTION get_top_products(
  start_date timestamptz,
  end_date timestamptz,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  product_name text,
  units_sold bigint,
  revenue numeric,
  profit numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.name,
    SUM(si.quantity) as units_sold,
    SUM(si.total_price) as revenue,
    SUM((si.unit_price - p.cost_price) * si.quantity) as profit
  FROM sale_items si
  JOIN products p ON si.product_id = p.id
  JOIN sales s ON si.sale_id = s.id
  WHERE s.status = 'completed'
    AND s.created_at >= start_date
    AND s.created_at <= end_date
  GROUP BY p.id, p.name
  ORDER BY revenue DESC
  LIMIT limit_count;
END;
$$;

-- Function to get sales by category with aggregation
CREATE OR REPLACE FUNCTION get_sales_by_category(
  start_date timestamptz,
  end_date timestamptz
)
RETURNS TABLE (
  category text,
  revenue numeric,
  percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH category_sales AS (
    SELECT
      p.category,
      SUM(si.total_price) as cat_revenue
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'completed'
      AND s.created_at >= start_date
      AND s.created_at <= end_date
    GROUP BY p.category
  ),
  total_revenue AS (
    SELECT SUM(cat_revenue) as total FROM category_sales
  )
  SELECT
    cs.category,
    cs.cat_revenue,
    CASE
      WHEN tr.total > 0 THEN (cs.cat_revenue / tr.total * 100)
      ELSE 0
    END as percentage
  FROM category_sales cs
  CROSS JOIN total_revenue tr
  ORDER BY cs.cat_revenue DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_report_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_by_date TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_by_category TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_dashboard_stats IS 'Efficiently calculates dashboard statistics using database aggregation, avoiding row limits';
COMMENT ON FUNCTION get_report_stats IS 'Efficiently calculates report statistics using database aggregation';
COMMENT ON FUNCTION get_sales_by_date IS 'Returns daily sales data for charts';
COMMENT ON FUNCTION get_top_products IS 'Returns top performing products by revenue';
COMMENT ON FUNCTION get_sales_by_category IS 'Returns sales breakdown by category';
