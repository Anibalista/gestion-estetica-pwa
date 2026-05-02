-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLAS PRINCIPALES
CREATE TABLE profesionales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_negocio TEXT NOT NULL,
    plan_suscripcion TEXT DEFAULT 'Gratis',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    telefono TEXT UNIQUE,
    fecha_nacimiento DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cliente_profesional (
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    profesional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    fecha_vinculo TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (cliente_id, profesional_id)
);

CREATE TABLE direcciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE UNIQUE,
    calle TEXT,
    numero TEXT,
    barrio TEXT,
    observaciones TEXT
);

CREATE TABLE patologias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE UNIQUE,
    hipertension BOOLEAN DEFAULT false,
    diabetes BOOLEAN DEFAULT false,
    varices BOOLEAN DEFAULT false,
    cirugias_recientes BOOLEAN DEFAULT false,
    observaciones_extra TEXT
);

CREATE TABLE servicios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    precio_actual NUMERIC NOT NULL,
    descripcion TEXT,
    duracion_minutos INT4,
    beneficios TEXT
);

CREATE TABLE servicio_profesional (
    servicio_id UUID REFERENCES servicios(id) ON DELETE CASCADE,
    profesional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (servicio_id, profesional_id)
);

CREATE TABLE combos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    precio_actual NUMERIC NOT NULL,
    duracion_minutos INT4,
    url_imagen TEXT,
    profesional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE combo_servicios (
    combo_id UUID REFERENCES combos(id) ON DELETE CASCADE,
    servicio_id UUID REFERENCES servicios(id) ON DELETE CASCADE,
    PRIMARY KEY (combo_id, servicio_id)
);

CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profesional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    codigo TEXT,
    descripcion TEXT NOT NULL,
    dosificacion NUMERIC,
    unidad_medida TEXT,
    cantidad_suelta NUMERIC,
    unidades_enteras INT4 DEFAULT 0,
    precio_venta NUMERIC NOT NULL,
    costo_unidad NUMERIC,
    proximo_vencimiento DATE,
    stock_minimo INT4,
    activo BOOLEAN DEFAULT true
);

CREATE TABLE costo_servicio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    servicio_id UUID REFERENCES servicios(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
    descripcion TEXT,
    monto NUMERIC NOT NULL,
    cantidad_suelta_usada NUMERIC,
    unidades_usadas INT4
);

CREATE TABLE sesiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) NOT NULL,
    profesional_id UUID REFERENCES auth.users(id) NOT NULL,
    fecha_hora TIMESTAMPTZ NOT NULL,
    monto_total NUMERIC NOT NULL,
    monto_cobrado NUMERIC DEFAULT 0,
    duracion_total INT4,
    estado TEXT DEFAULT 'Pendiente',
    observaciones TEXT
);

CREATE TABLE sesion_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
    servicio_id UUID REFERENCES servicios(id),
    combo_id UUID REFERENCES combos(id),
    precio_cobrado NUMERIC NOT NULL
);

CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_venta TEXT NOT NULL,
    profesional_id UUID REFERENCES auth.users(id) NOT NULL,
    cliente_id UUID REFERENCES clientes(id),
    fecha_hora TIMESTAMPTZ DEFAULT now(),
    monto_total NUMERIC NOT NULL,
    monto_cobrado NUMERIC NOT NULL,
    medio_pago TEXT NOT NULL,
    estado TEXT DEFAULT 'Completada'
);

CREATE TABLE venta_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id),
    descripcion TEXT NOT NULL,
    cantidad NUMERIC NOT NULL,
    precio_unitario NUMERIC NOT NULL,
    subtotal NUMERIC NOT NULL
);

-- 3. FUNCIÓN RPC PARA VENTAS Y STOCK
CREATE OR REPLACE FUNCTION procesar_venta_con_stock(p_venta JSONB, p_detalles JSONB[]) 
RETURNS UUID AS $$
DECLARE
    v_venta_id UUID;
    v_detalle JSONB;
BEGIN
    INSERT INTO ventas (numero_venta, profesional_id, cliente_id, monto_total, monto_cobrado, medio_pago, estado)
    VALUES (p_venta->>'numero_venta', (p_venta->>'profesional_id')::UUID, (p_venta->>'cliente_id')::UUID, (p_venta->>'monto_total')::DECIMAL, (p_venta->>'monto_cobrado')::DECIMAL, p_venta->>'medio_pago', 'Completada')
    RETURNING id INTO v_venta_id;

    FOREACH v_detalle IN ARRAY p_detalles LOOP
        INSERT INTO venta_detalles (venta_id, producto_id, descripcion, cantidad, precio_unitario, subtotal)
        VALUES (v_venta_id, (v_detalle->>'producto_id')::UUID, v_detalle->>'descripcion', (v_detalle->>'cantidad')::NUMERIC, (v_detalle->>'precio_unitario')::DECIMAL, (v_detalle->>'subtotal')::DECIMAL);

        UPDATE productos SET unidades_enteras = unidades_enteras - (v_detalle->>'cantidad')::INTEGER
        WHERE id = (v_detalle->>'producto_id')::UUID;
    END LOOP;
    RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql;