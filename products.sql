-- Migration: Insert products from EXCEL.XLSX
-- Description: Imports all 73 valid products (65 with codes + 8 auto-generated)
-- Date: 2025-11-21
-- Note: Auto-generated codes for products without codes (AUTO-001, AUTO-002, etc.)
-- Note: 5 products with zero prices excluded

BEGIN;

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('SMIRNOFF ICE PINEAPPLE CAN 300ml', 'Beverages', 'INV689', 352.92, 176.46, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('BEST VODKA 750ml', 'Beverages', 'INV00436', 1370.00, 685.00, 12, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('SAVANNA ANGRY LEMON 330ml', 'Beverages', 'INV00107', 516.00, 258.00, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('HEINEKEN 0.0  300ml', 'Beverages', 'INV00197', 407.58, 203.79, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('DELMONTE JUICE 1L-TROPICAL', 'Beverages', 'INV00448', 488.00, 244.00, 6, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('OJ 16%', 'Beverages', 'INV644', 665.60, 332.80, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('BEEFETER ORIGINAL 750ml', 'Beverages', 'INV527', 3391.24, 1695.62, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('KIBAO VODKA 750ml', 'Beverages', 'INV00269', 1258.18, 629.09, 12, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('COUNTY 750ml', 'Beverages', 'INV00112', 1302.00, 651.00, 12, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('BALLANTINE 750ml', 'Beverages', 'INV0042', 3578.08, 1789.04, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('SAVANNA DRY 330ml', 'Beverages', 'INV00366', 484.00, 242.00, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('CHIVAS 12years 750ml', 'Beverages', 'INV0099', 5787.10, 2893.55, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('OJ 20%', 'Beverages', 'INV867', 696.80, 348.40, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('KO PASSION & LIME BTL 330ml', 'Beverages', 'INV00279', 472.50, 236.25, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('HEINEKEN BOTTLE  300ml', 'Beverages', 'INV00196', 460.00, 230.00, 48, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('MANYATTA P & M 330ml', 'Beverages', 'INV906', 500.00, 250.00, 48, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('CHROME 750ml', 'Beverages', 'INV00100', 1150.00, 575.00, 12, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('DELMONTE JUICE 1L-ORANGE', 'Beverages', 'INV00449', 537.52, 268.76, 6, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('DELMONTE JUICE 1L-PASSION', 'Beverages', 'INV00444', 488.00, 244.00, 6, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('DELMONTE JUICE 1L-MIXED BERRY', 'Beverages', 'INV00446', 488.00, 244.00, 6, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('SAFARI            500ml', 'Beverages', 'INV00363', 40.00, 20.00, 120, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('SAFARI LEMONADE 300ml', 'Beverages', 'INV590', 80.00, 40.00, 48, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('CIROC VODKA 700ml', 'Beverages', 'INV1019', 2040.00, 1020.00, 1, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('SMIRNOFF VODKA 1L RED', 'Beverages', 'INV00378', 3239.52, 1619.76, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('SMIRNOFF VODKA 750ml', 'Beverages', 'INV00377', 2517.36, 1258.68, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('ABSOLUT VODKA 750ml', 'Beverages', 'INV0012', 3541.34, 1770.67, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('K.C PINEAPPLE 750ml', 'Beverages', 'INV00480', 1362.72, 681.36, 6, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('KENYA CANE LEMON & GINGER 750ml', 'Beverages', 'INV918', 1366.00, 683.00, 6, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('HENNESY VS 700ml', 'Beverages', 'INV00203', 8944.00, 4472.00, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('MARTEL VS 700ml', 'Beverages', 'INV00285', 9528.00, 4764.00, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('BOND 7 750ml', 'Beverages', 'INV0071', 2517.36, 1258.68, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('VAT 69 750ml', 'Beverages', 'INV00415', 2870.40, 1435.20, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('SINGLETON DUFFTOWN 12years 750ml', 'Beverages', 'INV00369', 9251.84, 4625.92, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('FAMOUS GROUSE 750ml', 'Beverages', 'INV00137', 3714.88, 1857.44, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('JAMESON 750ml', 'Beverages', 'INV00235', 4752.54, 2376.27, 4, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('JOHN WALKER RED LABEL 1L', 'Beverages', 'INV00244', 4047.30, 2023.65, 12, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('JOHN WALKER RED LABEL 750ml', 'Beverages', 'INV00245', 3348.80, 1674.40, 6, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('JOHN WALKER BLACK LABEL 750ml', 'Beverages', 'INV00222', 6001.68, 3000.84, 6, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('REDBULL 250ml', 'Beverages', 'INV00344', 358.00, 179.00, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('KERINGET 1L', 'Beverages', 'INV635', 154.00, 77.00, 60, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('WHITE CAP 500ml', 'Beverages', 'INV00421', 444.96, 222.48, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('TUSKER MALT CAN', 'Beverages', 'INV00411', 491.64, 245.82, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('SNAPP 330ml', 'Beverages', 'INV00381', 352.00, 176.00, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('SMIRNOFF GUARANA 330ml', 'Beverages', 'INV00376', 352.00, 176.00, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('SMIRNOFF BLACK ICE CAN 330ml', 'Beverages', 'INV00374', 352.00, 176.00, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('TUSKER CIDER 500ml', 'Beverages', 'INV00409', 482.04, 241.02, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('TUSKER LITE 500ml', 'Beverages', 'INV00410', 491.64, 245.82, 24, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('NEDERBURG PINOTAGE 750ml', 'Beverages', 'INV', 3731.52, 1865.76, 1, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('CELLAR CASK WHITE 750ml', 'Beverages', 'INV0093', 1874.60, 937.30, 1, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('CELLAR CASK JHB RED 750ml', 'Beverages', 'INV0094', 1954.94, 977.47, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('DROSTY HOF 5L RED', 'Beverages', 'INV00128', 8796.32, 4398.16, 1, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('DROSTY HOF 5L WHITE', 'Beverages', 'INV00129', 9042.86, 4521.43, 1, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('CELLAR CASK RED 5L', 'Beverages', 'INV0091', 8225.28, 4112.64, 1, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('TEQUILA CAMINO GOLD 750ml', 'Beverages', 'INV00399', 4576.00, 2288.00, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('TEQUILA CAMINO CLEAR 750ml', 'Beverages', 'INV00398', 4576.00, 2288.00, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('JOSE CUERVO SILVER 750ml', 'Beverages', 'INV00251', 4944.00, 2472.00, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('JOSE CUERVO GOLD 750ml', 'Beverages', 'INV00252', 4944.00, 2472.00, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('JAGERMEISTER 700ml WITH CORK', 'Beverages', 'INV741', 4411.68, 2205.84, 4, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('BAILEYS 750ml', 'Beverages', 'INV0037', 4374.00, 2187.00, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('AMARULA 750ml', 'Beverages', 'INV0024', 4017.00, 2008.50, 4, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('SOUTHERN COMFORT 750ml', 'Beverages', 'INV00387', 3604.80, 1802.40, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('BACARDI CARTA ORO 750ml', 'Beverages', 'INV641', 4784.00, 2392.00, 1, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('BACARDI CLEAR 750ml', 'Beverages', 'INV0033', 3996.00, 1998.00, 1, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('MALIBU 750ml', 'Beverages', 'INV00184', 3425.18, 1712.59, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('CAPTAIN MORGAN S/GOLD 750ml', 'Beverages', 'INV0084', 3306.00, 1653.00, 6, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('WHITE CAP LOCAL 500ml 25x01', 'Beverages', 'AUTO-001', 8427.59, 4213.80, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('BALOZI LAGER 500ml RET 25x01 LOCAL', 'Beverages', 'AUTO-002', 7284.48, 3642.24, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('GUINNESS FES 500ml 25x01 LOCAL', 'Beverages', 'AUTO-003', 8808.62, 4404.31, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('TUSKER IN BOTTL500ml RET 25x01 LOCAL', 'Beverages', 'AUTO-004', 7284.48, 3642.24, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('TUSKER LITE 330ml RET 25x01 LITE', 'Beverages', 'AUTO-005', 8046.56, 4023.28, 1, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('TUSKER MALT IN 330ml RET 25x01', 'Beverages', 'AUTO-006', 8046.56, 4023.28, 1, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('TUSKER CDR IN B 500ml RET 25x01 LOCAL', 'Beverages', 'AUTO-007', 9572.42, 4786.21, 1, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();

INSERT INTO products (name, category, barcode, unit_price, cost_price, stock_quantity, min_stock_level, unit)
VALUES ('SNAPP 300ml RET 25x01', 'Beverages', 'AUTO-008', 6865.52, 3432.76, 2, 5, 'pieces')
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity,
  updated_at = NOW();


COMMIT;

-- Summary: Successfully inserted/updated 73 products
-- Skipped: 5 products (zero prices)
-- Auto-generated codes: 8 products

