-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.cliente_profesional (
  cliente_id uuid NOT NULL,
  profesional_id uuid NOT NULL,
  fecha_vinculo timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cliente_profesional_pkey PRIMARY KEY (cliente_id, profesional_id),
  CONSTRAINT cliente_profesional_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  CONSTRAINT cliente_profesional_profesional_id_fkey FOREIGN KEY (profesional_id) REFERENCES public.profesionales(id)
);
CREATE TABLE public.clientes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  telefono text NOT NULL UNIQUE,
  fecha_nacimiento date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clientes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.combo_servicios (
  combo_id uuid NOT NULL,
  servicio_id uuid NOT NULL,
  CONSTRAINT combo_servicios_pkey PRIMARY KEY (combo_id, servicio_id),
  CONSTRAINT combo_servicios_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES public.combos(id),
  CONSTRAINT combo_servicios_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id)
);
CREATE TABLE public.combos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  precio_actual numeric NOT NULL,
  duracion_minutos integer,
  url_imagen text,
  profesional_id uuid,
  CONSTRAINT combos_pkey PRIMARY KEY (id),
  CONSTRAINT combos_profesional_id_fkey FOREIGN KEY (profesional_id) REFERENCES public.profesionales(id)
);
CREATE TABLE public.costo_servicio (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  servicio_id uuid,
  producto_id uuid,
  descripcion text NOT NULL,
  monto numeric NOT NULL,
  cantidad_suelta_usada numeric,
  unidades_usadas integer,
  CONSTRAINT costo_servicio_pkey PRIMARY KEY (id),
  CONSTRAINT costo_servicio_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id),
  CONSTRAINT costo_servicio_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id)
);
CREATE TABLE public.direcciones (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cliente_id uuid UNIQUE,
  calle text,
  numero text,
  barrio text,
  observaciones text,
  CONSTRAINT direcciones_pkey PRIMARY KEY (id),
  CONSTRAINT direcciones_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);
CREATE TABLE public.patologias (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cliente_id uuid UNIQUE,
  hipertension boolean NOT NULL DEFAULT false,
  diabetes boolean NOT NULL DEFAULT false,
  varices boolean NOT NULL DEFAULT false,
  cirugias_recientes boolean NOT NULL DEFAULT false,
  observaciones_extra text,
  CONSTRAINT patologias_pkey PRIMARY KEY (id),
  CONSTRAINT patologias_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);
CREATE TABLE public.productos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  profesional_id uuid NOT NULL,
  codigo text NOT NULL,
  descripcion text NOT NULL,
  dosificacion numeric NOT NULL,
  unidad_medida text NOT NULL,
  cantidad_suelta numeric,
  unidades_enteras integer,
  precio_venta numeric NOT NULL,
  costo_unidad numeric NOT NULL,
  proximo_vencimiento date,
  stock_minimo integer DEFAULT 0,
  activo boolean DEFAULT true,
  CONSTRAINT productos_pkey PRIMARY KEY (id),
  CONSTRAINT productos_profesional_id_fkey FOREIGN KEY (profesional_id) REFERENCES public.profesionales(id)
);
CREATE TABLE public.profesionales (
  id uuid NOT NULL,
  nombre_negocio text NOT NULL,
  plan_suscripcion text NOT NULL DEFAULT 'Gratis'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profesionales_pkey PRIMARY KEY (id),
  CONSTRAINT profesionales_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.servicio_profesional (
  servicio_id uuid NOT NULL,
  profesional_id uuid NOT NULL,
  CONSTRAINT servicio_profesional_pkey PRIMARY KEY (servicio_id, profesional_id),
  CONSTRAINT servicio_profesional_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id),
  CONSTRAINT servicio_profesional_profesional_id_fkey FOREIGN KEY (profesional_id) REFERENCES public.profesionales(id)
);
CREATE TABLE public.servicios (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  precio_actual numeric NOT NULL,
  descripcion text,
  duracion_minutos integer,
  beneficios text,
  CONSTRAINT servicios_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sesion_detalles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sesion_id uuid,
  servicio_id uuid,
  combo_id uuid,
  precio_cobrado numeric NOT NULL,
  CONSTRAINT sesion_detalles_pkey PRIMARY KEY (id),
  CONSTRAINT sesion_detalles_sesion_id_fkey FOREIGN KEY (sesion_id) REFERENCES public.sesiones(id),
  CONSTRAINT sesion_detalles_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id),
  CONSTRAINT sesion_detalles_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES public.combos(id)
);
CREATE TABLE public.sesiones (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cliente_id uuid NOT NULL,
  profesional_id uuid NOT NULL,
  fecha_hora timestamp with time zone NOT NULL,
  monto_total numeric NOT NULL DEFAULT 0,
  observaciones text,
  estado text NOT NULL DEFAULT 'Pendiente'::text CHECK (estado = ANY (ARRAY['Pendiente'::text, 'Cobrada'::text, 'Anulada'::text, 'Ausente'::text])),
  monto_cobrado numeric DEFAULT 0,
  duracion_total integer DEFAULT 0,
  a_domicilio boolean DEFAULT false,
  medio_pago text CHECK (medio_pago IS NULL OR (medio_pago = ANY (ARRAY['Efectivo'::text, 'Transferencia'::text, 'Tarjeta'::text]))),
  CONSTRAINT sesiones_pkey PRIMARY KEY (id),
  CONSTRAINT sesiones_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  CONSTRAINT sesiones_profesional_id_fkey FOREIGN KEY (profesional_id) REFERENCES public.profesionales(id)
);
CREATE TABLE public.venta_detalles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  venta_id uuid,
  producto_id uuid,
  descripcion text NOT NULL,
  cantidad numeric NOT NULL DEFAULT 1,
  precio_unitario numeric NOT NULL,
  subtotal numeric NOT NULL,
  CONSTRAINT venta_detalles_pkey PRIMARY KEY (id),
  CONSTRAINT venta_detalles_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id),
  CONSTRAINT venta_detalles_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id)
);
CREATE TABLE public.ventas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  numero_venta text NOT NULL,
  profesional_id uuid NOT NULL,
  cliente_id uuid,
  fecha_hora timestamp with time zone DEFAULT timezone('utc'::text, now()),
  monto_total numeric NOT NULL DEFAULT 0,
  monto_cobrado numeric NOT NULL DEFAULT 0,
  medio_pago text NOT NULL DEFAULT 'Efectivo'::text,
  estado text NOT NULL DEFAULT 'Completada'::text CHECK (estado = ANY (ARRAY['Completada'::text, 'Anulada'::text])),
  CONSTRAINT ventas_pkey PRIMARY KEY (id),
  CONSTRAINT ventas_profesional_id_fkey FOREIGN KEY (profesional_id) REFERENCES auth.users(id),
  CONSTRAINT ventas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);