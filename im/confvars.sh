#! /bin/sh
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

MOZ_APP_NAME=instantbird
MOZ_XUL_APP=1
MOZ_ENABLE_LIBXUL=1
MOZ_CHROME_FILE_FORMAT=omni
MOZ_UPDATER=1
MOZ_MATHML=
# WebRTC doesn't compile correctly on Mac on Mozilla 18.
MOZ_WEBRTC=

MOZ_APP_VERSION_TXT=${_topsrcdir}/$MOZ_BUILD_APP/config/version.txt
MOZ_APP_VERSION=`cat $MOZ_APP_VERSION_TXT`
INSTANTBIRD_VERSION=$MOZ_APP_VERSION

MOZ_BRANDING_DIRECTORY=instantbird/branding/nightly
MOZ_OFFICIAL_BRANDING_DIRECTORY=instantbird/branding/release
