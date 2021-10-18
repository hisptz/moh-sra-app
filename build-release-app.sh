#!/usr/bin/env bash
ionic cordova build --prod --aot --minifyjs --minifycss --optimizejs --release
# keytool -genkey -v -keystore my-release-key.keystore -alias dhis2udsm -keyalg RSA -keysize 2048 -validity 10000
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.jks platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk dhis2udsm

zipalign -v 4 platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk platforms/android/app/build/outputs/apk/release/moh-sra-app-v-1.3.4.apk
