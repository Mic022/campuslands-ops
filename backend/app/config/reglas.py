"""Perillas del negocio en un solo lugar.

Cualquier cambio pedido en la modificación en vivo empieza aquí.
"""

HORA_APERTURA = 6               # 6:00
HORA_CIERRE = 22                # 22:00
MAX_HORAS_RESERVA = 4
FACTOR_AFORO = 1.0              # 0.9 = permitir solo el 90 % del aforo
MAX_PRESTAMOS_ACTIVOS = 2       # por solicitante
PRIORIDADES_BLOQUEANTES = {"critica", "alta"}
UMBRAL_CONFIANZA_IA = 0.6       # por debajo, la clasificación exige revisión humana
MAX_LARGO_DESCRIPCION = 1000    # caracteres de una incidencia
