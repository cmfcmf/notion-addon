function getPreferences() {
  const prefs = PropertiesService.getUserProperties().getProperties();
  if (prefs.token_v2 === undefined) {
    prefs.token_v2 = "";
  }
  if (prefs.dbSettings === undefined) {
    prefs.dbSettings = {};
  } else {
    prefs.dbSettings = JSON.parse(prefs.dbSettings);
  }
  return prefs;
}

function deletePreferences(e) {
  PropertiesService.getUserProperties().deleteAllProperties();
  return CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification().setText("Logged out successfully.")
    )
    .setNavigation(
      CardService.newNavigation()
        .popToRoot()
        .updateCard(RootCard())
    )
    .build();
}

function savePreferences(e) {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperties(
    {
      token_v2: e.commonEventObject.formInputs.token_v2.stringInputs.value[0]
    },
    true
  );

  function getUserInfo() {
    const data = post("loadUserContent");
    const user =
      data.recordMap.notion_user[Object.keys(data.recordMap.notion_user)[0]]
        .value;
    const name = user.given_name + " " + user.family_name;
    const email = user.email;
    const photo = user.profile_photo;

    const settings =
      data.recordMap.user_settings[Object.keys(data.recordMap.user_settings)[0]]
        .value.settings;
    const locale = settings.locale;
    const timezone = settings.time_zone;

    return {
      user_name: name,
      user_email: email,
      user_photo: photo,
      user_locale: locale,
      user_timezone: timezone
    };
  }

  userProperties.setProperties(getUserInfo());

  return CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification().setText("Logged in successfully.")
    )
    .setNavigation(
      CardService.newNavigation()
        .popToRoot()
        .updateCard(RootCard())
    )
    .build();
}
