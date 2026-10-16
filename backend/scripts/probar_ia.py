"""Verifica en un minuto que el proveedor de IA configurado en .env responde.

Uso (desde backend/):  python -m scripts.probar_ia

Hace una llamada real con un esquema JSON mínimo e imprime el resultado y la latencia.
No escribe nada en la BD.
"""
import json

from pydantic import BaseModel, Field

from app.ai.proveedor import ErrorProveedor, esquema_estricto, medir, obtener_proveedor


class Eco(BaseModel):
    ok: bool
    resumen: str = Field(max_length=120)


def main() -> None:
    try:
        proveedor = obtener_proveedor()
    except ErrorProveedor as e:
        print(f"✗ {e}")
        return
    print(f"Proveedor: {proveedor.nombre} · modelo: {proveedor.modelo}")

    mensajes = [
        {"role": "system", "content": "Responde solo con un objeto JSON con las claves ok y resumen."},
        {"role": "user", "content": "Confirma que recibes este mensaje y resume en una frase: 'el videobeam del aula Cosmos echa humo'."},
    ]
    try:
        texto, ms = medir(proveedor.completar, mensajes, esquema=esquema_estricto(Eco))
    except ErrorProveedor as e:
        print(f"✗ IA no disponible: {e}")
        return

    try:
        eco = Eco.model_validate_json(texto)
    except ValueError:
        print(f"✗ Respondió en {ms} ms, pero el JSON no cumple el esquema:\n{texto}")
        return
    print(f"✓ Respondió en {ms} ms con JSON válido:")
    print(json.dumps(eco.model_dump(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
