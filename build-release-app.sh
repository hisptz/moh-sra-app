#!/usr/bin/env bash

# GENERATING SIGNING KEYS 
# ionic cordova build --prod --aot --minifyjs --minifycss --opxtimizejs --release
# keytool -genkey -v -keystore my-release-key.keystore -alias dhis2udsm -keyalg RSA -keysize 2048 -validity 10000

# SIGNING APK FILES
# jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.jks platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk dhis2udsm
# zipalign -v 4 platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk platforms/android/app/build/outputs/apk/release/moh-sra-app-1.0.8.apk


# SIGN ABB FORMAT
# ionic cordova build android --release
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.jks platforms/android/app/build/outputs/bundle/release/app-release.aab dhis2udsm
zipalign -v 4 platforms/android/app/build/outputs/bundle/release/app-release.aab platforms/android/app/build/outputs/bundle/release/moh-sra-app-1.0.8.aab
