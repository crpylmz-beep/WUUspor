# scripts/vapid_olustur.py
# VAPID (Web Push) anahtar çifti üretir.
# Public key: js/push.js içinde telefon tarafta kullanılır.
# Private key: GitHub Secrets'a eklenir, Actions'da bildirim göndermek için kullanılır.
# Hiçbir gizli bilgi dosyaya kalıcı olarak yazılmaz, sadece ekrana yazdırılır.

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64


def vapid_anahtari_uret():
    # VAPID anahtar çifti üret (SECP256R1 eliptik eğri)
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    # Public key'i base64 URL-safe encode et
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    public_key_b64 = base64.urlsafe_b64encode(public_bytes).decode("utf-8").rstrip("=")

    # Private key'i base64 URL-safe encode et
    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    private_key_b64 = base64.urlsafe_b64encode(private_bytes).decode("utf-8").rstrip("=")

    return public_key_b64, private_key_b64


def main():
    print("=" * 60)
    print("WUUspor — VAPID Anahtar Üretici")
    print("=" * 60)
    print()

    public_key, private_key = vapid_anahtari_uret()

    print("VAPID PUBLIC KEY (kopyalayın, js/push.js içine yapıştıracaksınız):")
    print("-" * 60)
    print(public_key)
    print("-" * 60)
    print()

    print("VAPID PRIVATE KEY (kopyalayın, GitHub Secrets'a VAPID_PRIVATE_KEY olarak ekleyeceksiniz):")
    print("-" * 60)
    print(private_key)
    print("-" * 60)
    print()

    print("ADIMLAR:")
    print("1. Public key'i kopyalayın ve js/push.js dosyasındaki VAPID_PUBLIC_KEY değişkenine yapıştırın.")
    print("2. Private key'i kopyalayın ve GitHub'da: Settings → Secrets and variables → Actions")
    print("   'New repository secret' diyerek: Name: VAPID_PRIVATE_KEY, Value: <private key> ekleyin.")
    print("3. Uygulamada bildirim izni verdikten sonra, abonelik bilgisini (PUSH_SUBSCRIPTION)")
    print("   aynı şekilde GitHub Secrets'a ekleyin.")
    print()
    print("=" * 60)
    print("İşlem tamamlandı.")


if __name__ == "__main__":
    main()