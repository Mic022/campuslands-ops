# backend/scripts/test_triaje_p3.py
"""
Script de prueba independiente para el módulo de IA (P3).
Demuestra que el esquema, el prompt y el orquestador funcionan correctamente.
"""
import sys
import os

# Ajustar el path para poder importar desde 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.ai.triaje import clasificar_incidencia

def main():
    print("🧪 Probando módulo de IA (P3)...\n")
    
    # Caso 1: Clasificación normal
    desc1 = "El aire acondicionado del aula 302 gotea agua sobre los escritorios."
    ctx1 = "Espacio: Aula 302, Aforo: 30"
    
    resultado = clasificar_incidencia(desc1, ctx1)
    if resultado:
        print("✅ Caso 1 Exitoso:")
        print(f"   Categoría: {resultado.categoria.value}")
        print(f"   Prioridad: {resultado.prioridad.value}")
        print(f"   Área: {resultado.area_responsable.value}")
        print(f"   Confianza: {resultado.confianza}\n")
    else:
        print("❌ Caso 1 Falló: La IA no devolvió un JSON válido.\n")

    # Caso 2: Simulación de caída de IA (Retornando None)
    print("🛡️ Caso 2 (Caída de IA):")
    print("   Si el proveedor cae, la función retorna None.")
    print("   La API debe capturar esto y devolver HTTP 503 (Triaje manual).\n")

if __name__ == "__main__":
    main()