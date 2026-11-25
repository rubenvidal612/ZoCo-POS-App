// Catálogo base de lavandería y tintorería.
// Precios de referencia en MXN (2026) para que el negocio solo los ajuste.
// section: lavado | planchado | tintoreria | tenis | edredones | insumos

const p = (name, section, price, cost, extra = {}) => ({ name, section, price, cost, ...extra });

export const CATALOGO_LAVANDERIA = [
  // ---------- Lavado ----------
  p('Lavado por kilo', 'lavado', 24, 9, { code: 'LAV-001', sellBy: 'kg' }),
  p('Lavado y secado por kilo', 'lavado', 32, 12, { code: 'LAV-002', sellBy: 'kg' }),
  p('Camisa lavado', 'lavado', 30, 11, { code: 'LAV-003' }),
  p('Pantalón lavado', 'lavado', 32, 12, { code: 'LAV-004' }),
  p('Playera lavado', 'lavado', 25, 9, { code: 'LAV-005' }),
  p('Blusa lavado', 'lavado', 28, 10, { code: 'LAV-006' }),
  p('Falda lavado', 'lavado', 30, 11, { code: 'LAV-007' }),
  p('Vestido lavado', 'lavado', 45, 16, { code: 'LAV-008' }),
  p('Sudadera lavado', 'lavado', 40, 15, { code: 'LAV-009' }),
  p('Ropa de bebé (5 pzas)', 'lavado', 55, 20, { code: 'LAV-010' }),
  p('Sábana lavado', 'lavado', 40, 14, { code: 'LAV-011' }),
  p('Funda lavado', 'lavado', 18, 7, { code: 'LAV-012' }),
  p('Toalla lavado', 'lavado', 22, 8, { code: 'LAV-013' }),
  p('Cobija lavado', 'lavado', 65, 24, { code: 'LAV-014' }),
  p('Colcha lavado', 'lavado', 75, 28, { code: 'LAV-015' }),
  p('Cortina lavado', 'lavado', 70, 26, { code: 'LAV-016' }),

  // ---------- Planchado ----------
  p('Camisa planchada', 'planchado', 25, 9, { code: 'PLA-001' }),
  p('Pantalón planchado', 'planchado', 25, 9, { code: 'PLA-002' }),
  p('Blusa planchada', 'planchado', 25, 9, { code: 'PLA-003' }),
  p('Vestido planchado', 'planchado', 35, 13, { code: 'PLA-004' }),
  p('Traje planchado (2 pzas)', 'planchado', 60, 22, { code: 'PLA-005' }),
  p('Sábana planchada', 'planchado', 30, 11, { code: 'PLA-006' }),
  p('Pieza extra de planchado', 'planchado', 15, 5, { code: 'PLA-007' }),

  // ---------- Tintorería ----------
  p('Traje tintorería (2 pzas)', 'tintoreria', 180, 65, { code: 'TIN-001' }),
  p('Saco tintorería', 'tintoreria', 95, 34, { code: 'TIN-002' }),
  p('Pantalón de vestir tintorería', 'tintoreria', 90, 32, { code: 'TIN-003' }),
  p('Vestido de fiesta tintorería', 'tintoreria', 150, 55, { code: 'TIN-004' }),
  p('Abrigo tintorería', 'tintoreria', 170, 62, { code: 'TIN-005' }),
  p('Chamarra tintorería', 'tintoreria', 130, 48, { code: 'TIN-006' }),
  p('Corbata tintorería', 'tintoreria', 45, 16, { code: 'TIN-007' }),
  p('Blusa de seda tintorería', 'tintoreria', 85, 30, { code: 'TIN-008' }),
  p('Quitar mancha', 'tintoreria', 40, 14, { code: 'TIN-009' }),
  p('Blanqueado de ropa blanca', 'tintoreria', 60, 22, { code: 'TIN-010' }),

  // ---------- Tenis y calzado ----------
  p('Tenis lavado básico', 'tenis', 120, 45, { code: 'TEN-001' }),
  p('Tenis lavado profundo', 'tenis', 160, 60, { code: 'TEN-002' }),
  p('Tenis blancos (blanqueado)', 'tenis', 180, 68, { code: 'TEN-003' }),
  p('Tenis premium (suela y cordones)', 'tenis', 220, 82, { code: 'TEN-004' }),
  p('Limpieza de suela', 'tenis', 70, 26, { code: 'TEN-005' }),
  p('Botas de piel', 'tenis', 190, 70, { code: 'TEN-006' }),

  // ---------- Edredones y hogar ----------
  p('Edredón individual', 'edredones', 150, 55, { code: 'EDR-001' }),
  p('Edredón matrimonial', 'edredones', 200, 74, { code: 'EDR-002' }),
  p('Edredón king size', 'edredones', 250, 92, { code: 'EDR-003' }),
  p('Almohada', 'edredones', 80, 30, { code: 'EDR-004' }),
  p('Cojín', 'edredones', 60, 22, { code: 'EDR-005' }),
  p('Colchoneta', 'edredones', 180, 66, { code: 'EDR-006' }),
  p('Tapete', 'edredones', 140, 50, { code: 'EDR-007' }),

  // ---------- Insumos (no se venden: control de existencia) ----------
  p('Detergente líquido 1 L', 'insumos', 0, 48, { code: 'INS-001' }),
  p('Suavizante 1 L', 'insumos', 0, 42, { code: 'INS-002' }),
  p('Quitamanchas 500 ml', 'insumos', 0, 65, { code: 'INS-003' }),
  p('Perfume para ropa', 'insumos', 0, 85, { code: 'INS-004' }),
  p('Bolsas para ropa (100 pzas)', 'insumos', 0, 120, { code: 'INS-005' }),
  p('Ganchos para camisa (100 pzas)', 'insumos', 0, 95, { code: 'INS-006' }),
  p('Papel para empaque (rollo)', 'insumos', 0, 70, { code: 'INS-007' }),
];

export const CATALOGO_LAVANDERIA_TOTAL = CATALOGO_LAVANDERIA.length;
