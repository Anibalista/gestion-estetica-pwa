# 💆‍♀️ Sistema de Gestión para Estética y Masoterapia (PWA)

Aplicación Web Progresiva (PWA) diseñada para la gestión integral de centros de estética, masajes y terapeutas independientes. Arquitectura Multi-Tenant (SaaS) optimizada para uso offline, control de insumos y rápida carga.

## 🚀 Stack Tecnológico

* **Base de Datos & Backend:** PostgreSQL (Supabase)
* **Autenticación:** Supabase Auth
* **Frontend:** React (Configurado como PWA)
* **Estilos:** Tailwind CSS
* **Hosting:** Vercel / Netlify

## 🎯 Épicas y Funcionalidades Principales

1.  **Gestión Multiprofesional (Multi-Tenant):** Aislamiento de datos mediante Row Level Security (RLS). Cada profesional gestiona sus propios clientes, servicios y ventas.
2.  **Agenda y Sesiones Inteligentes:** Registro de citas con validación de disponibilidad horaria y estados (Pendiente, Cobrada, Ausente, Anulada). Permite múltiples servicios/combos por sesión.
3.  **Punto de Venta (POS) e Inventario:** Venta de productos con descuento de stock automático mediante funciones RPC. Soporta múltiples medios de pago.
4.  **Control de Insumos (Rentabilidad):** Cálculo del costo de insumos por servicio (unidades enteras o cantidad suelta/dosificada) para determinar el margen real.
5.  **Ficha Clínica:** Registro de patologías (hipertensión, diabetes, etc.) y direcciones vinculadas de forma única a cada cliente.

## 🗄️ Modelo de Dominio (Entity-Relationship)

```mermaid
erDiagram
    PROFESIONALES ||--o{ CLIENTE_PROFESIONAL : "vincula"
    CLIENTES ||--o{ CLIENTE_PROFESIONAL : "vincula"
    
    PROFESIONALES ||--o{ SERVICIO_PROFESIONAL : "habilita"
    SERVICIOS ||--o{ SERVICIO_PROFESIONAL : "es prestado por"
    
    PROFESIONALES ||--o{ COMBOS : "crea"
    COMBOS ||--o{ COMBO_SERVICIOS : "agrupa"
    SERVICIOS ||--o{ COMBO_SERVICIOS : "incluido en"
    
    PROFESIONALES ||--o{ PRODUCTOS : "gestiona"
    SERVICIOS ||--o{ COSTO_SERVICIO : "genera gasto"
    PRODUCTOS ||--o| COSTO_SERVICIO : "insumo de"
    
    CLIENTES ||--o| DIRECCIONES : "reside en"
    CLIENTES ||--o| PATOLOGIAS : "reporta"
    
    SESIONES }|--|| CLIENTES : "para"
    SESIONES }|--|| PROFESIONALES : "por"
    SESIONES ||--|{ SESION_DETALLES : "desglosa"
    SERVICIOS ||--o{ SESION_DETALLES : "item"
    COMBOS ||--o{ SESION_DETALLES : "item"

    VENTAS }|--|| PROFESIONALES : "registra"
    VENTAS }|--o| CLIENTES : "compra"
    VENTAS ||--|{ VENTA_DETALLES : "contiene"
    PRODUCTOS ||--o{ VENTA_DETALLES : "item"

    PROFESIONALES {
        uuid id PK
        string nombre_negocio
        string plan_suscripcion
        timestamptz created_at
    }

    CLIENTES {
        uuid id PK
        string nombre
        string telefono UK
        date fecha_nacimiento
        timestamptz created_at
    }

    SERVICIOS {
        uuid id PK
        string nombre
        boolean activo
        numeric precio_actual
        string descripcion
        integer duracion_minutos
        string beneficios
    }

    COMBOS {
        uuid id PK
        string nombre
        boolean activo
        numeric precio_actual
        integer duracion_minutos
        string url_imagen
        uuid profesional_id FK
    }

    PRODUCTOS {
        uuid id PK
        uuid profesional_id FK
        string codigo
        string descripcion
        numeric dosificacion
        string unidad_medida
        numeric cantidad_suelta
        integer unidades_enteras
        numeric precio_venta
        numeric costo_unidad
        date proximo_vencimiento
        integer stock_minimo
        boolean activo
    }

    COSTO_SERVICIO {
        uuid id PK
        uuid servicio_id FK
        uuid producto_id FK
        string descripcion
        numeric monto
        numeric cantidad_suelta_usada
        integer unidades_usadas
    }

    SESIONES {
        uuid id PK
        uuid cliente_id FK
        uuid profesional_id FK
        timestamptz fecha_hora
        numeric monto_total
        numeric monto_cobrado
        integer duracion_total
        string estado
        string observaciones
    }

    VENTAS {
        uuid id PK
        string numero_venta
        uuid profesional_id FK
        uuid cliente_id FK
        timestamptz fecha_hora
        numeric monto_total
        numeric monto_cobrado
        string medio_pago
        string estado
    }
```