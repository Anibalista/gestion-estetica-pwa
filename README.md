# 💆‍♀️ Sistema de Gestión para Estética y Masoterapia (PWA)

Aplicación Web Progresiva (PWA) diseñada para la gestión integral de centros de estética, masajes y terapeutas independientes. Arquitectura Multi-Tenant (SaaS) optimizada para uso offline, control de insumos y rápida carga.

## 🚀 Stack Tecnológico

* **Base de Datos & Backend:** PostgreSQL (Supabase)
* **Autenticación:** Supabase Auth (Magic Links)
* **Frontend:** Vue.js / React (Configurado como PWA)
* **Estilos:** Tailwind CSS
* **Almacenamiento Offline:** Dexie.js (IndexedDB wrapper)
* **Hosting:** Vercel / Netlify

## 🎯 Épicas y Funcionalidades Principales

1.  **Gestión Multiprofesional (Multi-Tenant):** Aislamiento de datos por profesional, con capacidad de compartir clientes y servicios en un mismo centro.
2.  **Punto de Venta Dinámico:** Registro de sesiones combinando servicios individuales y combos, guardando una "foto" del precio cobrado para mantener el historial financiero inmutable.
3.  **Control de Insumos y Rentabilidad:** Cálculo automático del margen de ganancia restando el costo proporcional de los productos (ej. cremas, aceites) utilizados en cada servicio.
4.  **Historia Clínica y Aptitud:** Fichas de pacientes con registro de patologías, integrables mediante webhooks (n8n) desde formularios de Google.
5.  **Experiencia Offline-First:** Interfaz rápida sin tiempos de carga (lag), capaz de guardar registros sin conexión y sincronizar en segundo plano.

## 🗄️ Modelo de Dominio (Entity-Relationship)

```mermaid
erDiagram
    PROFESIONALES ||--o{ CLIENTE_PROFESIONAL : "vincula"
    CLIENTES ||--o{ CLIENTE_PROFESIONAL : "vincula"
    
    PROFESIONALES ||--o{ SERVICIO_PROFESIONAL : "habilita"
    SERVICIOS ||--o{ SERVICIO_PROFESIONAL : "es prestado por"
    
    SERVICIOS ||--o{ COMBO_SERVICIOS : "incluido en"
    COMBOS ||--o{ COMBO_SERVICIOS : "agrupa"
    
    SERVICIOS ||--o{ COSTO_SERVICIO : "genera gasto"
    PRODUCTOS ||--o| COSTO_SERVICIO : "se usa como insumo"
    
    CLIENTES ||--o| DIRECCIONES : "reside en"
    CLIENTES ||--o| PATOLOGIAS : "reporta"
    
    SESIONES }|--|| CLIENTES : "para el cliente"
    SESIONES }|--|| PROFESIONALES : "atendida por"
    SESIONES ||--|{ SESION_DETALLES : "desglosa cobro"
    
    SERVICIOS ||--o{ SESION_DETALLES : "vendido como item"
    COMBOS ||--o{ SESION_DETALLES : "vendido como item"

    PROFESIONALES {
        uuid id PK "NOT NULL"
        string nombre_negocio "NOT NULL"
        string plan_suscripcion "NOT NULL, Default: 'Gratis'"
    }

    CLIENTES {
        uuid id PK "NOT NULL"
        string nombre "NOT NULL"
        string telefono "NOT NULL"
    }

    CLIENTE_PROFESIONAL {
        uuid cliente_id PK, FK "NOT NULL"
        uuid profesional_id PK, FK "NOT NULL"
    }

    DIRECCIONES {
        uuid id PK "NOT NULL"
        uuid cliente_id FK "NOT NULL"
    }

    PATOLOGIAS {
        uuid id PK "NOT NULL"
        uuid cliente_id FK "NOT NULL"
    }

    SERVICIOS {
        uuid id PK "NOT NULL"
        string nombre "NOT NULL"
        boolean activo "NOT NULL"
        decimal precio_actual "NOT NULL"
    }

    SERVICIO_PROFESIONAL {
        uuid servicio_id PK, FK "NOT NULL"
        uuid profesional_id PK, FK "NOT NULL"
    }

    COMBOS {
        uuid id PK "NOT NULL"
        string nombre "NOT NULL"
        decimal precio_actual "NOT NULL"
    }

    COMBO_SERVICIOS {
        uuid combo_id PK, FK "NOT NULL"
        uuid servicio_id PK, FK "NOT NULL"
    }

    PRODUCTOS {
        uuid id PK "NOT NULL"
        uuid profesional_id FK "NOT NULL"
        string descripcion "NOT NULL"
        float dosificacion "NOT NULL"
        decimal cantidad_suelta "NULL (stock)"
        decimal costo_unidad "NOT NULL"
    }

    COSTO_SERVICIO {
        uuid id PK "NOT NULL"
        uuid servicio_id FK "NOT NULL"
        uuid producto_id FK "NULL"
        decimal monto "NOT NULL"
        float cantidad_suelta_usada "NULL"
    }

    SESIONES {
        uuid id PK "NOT NULL"
        uuid cliente_id FK "NOT NULL"
        uuid profesional_id FK "NOT NULL"
        decimal monto_total "NOT NULL"
    }

    SESION_DETALLES {
        uuid id PK "NOT NULL"
        uuid sesion_id FK "NOT NULL"
        decimal precio_cobrado "NOT NULL (histórico)"
    }