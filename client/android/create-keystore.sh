#!/bin/bash
# Generate a signing keystore for Play Store release
# Usage: ./create-keystore.sh

KEYSTORE_FILE="UYIR.keystore"
ALIAS="uyir"
VALIDITY_DAYS=10000

if [ -f "$KEYSTORE_FILE" ]; then
  echo "Keystore already exists: $KEYSTORE_FILE"
  exit 1
fi

# Check if keytool is available
if ! command -v keytool &> /dev/null; then
  echo "keytool not found. Please install JDK and ensure JAVA_HOME is set."
  exit 1
fi

echo "Creating UYIR signing keystore..."
echo "You will be prompted for passwords and organization details."
echo ""

keytool -genkey -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$VALIDITY_DAYS" \
  -dname "CN=UYIR Blood Network, O=UYIR, C=IN"

echo ""
echo "Keystore created: $KEYSTORE_FILE"
echo ""
echo "IMPORTANT: Keep this file secure and never commit it to version control."
echo ""
echo "To configure the build, set these environment variables:"
echo "  ANDROID_RELEASE_STORE_FILE=UYIR.keystore"
echo "  ANDROID_RELEASE_STORE_PASSWORD=<your-password>"
echo "  ANDROID_RELEASE_KEY_ALIAS=$ALIAS"
echo "  ANDROID_RELEASE_KEY_PASSWORD=<your-password>"
echo ""
echo "Or create android/local.properties:"
echo "  sdk.dir=/path/to/Android/Sdk"
echo ""
