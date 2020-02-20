function onHomepage(e) {
  return RootCard();
}

function pushCard(e) {
  const theClass = eval(e.parameters.card);
  const parameters = JSON.parse(e.parameters.parameters);
  return CardService.newActionResponseBuilder()
    .setNavigation(
      CardService.newNavigation().pushCard(new theClass(...parameters).build())
    )
    .build();
}

function RootCard() {
  const viewSettings = SettingsManager.getAllViewSettings();
  const cards = [new UserCard()];

  Object.entries(viewSettings).forEach(([viewId, settings]) => {
    if (!settings.enabled || !settings.databaseId) {
      return;
    }
    cards.push(new TasksCard(settings.databaseId, viewId));
  });

  cards.push(...[new DatabaseSettingsCard(), new AccountSettingsCard()]);

  const section = CardService.newCardSection();
  cards
    .filter(each => each.isEnabled())
    .forEach(each => section.addWidget(each.headerAsWidget()));

  return CardService.newCardBuilder()
    .addSection(section)
    .build();
}

class MyCard {
  isEnabled() {
    return true;
  }

  headerAsWidget() {
    const headerData = this._getHeader();
    const kv = CardService.newKeyValue();
    if (headerData.title) {
      kv.setContent(headerData.title);
    }
    if (headerData.imageUrl && headerData.imageAltText) {
      kv.setIconUrl(headerData.imageUrl);
      kv.setIconAltText(headerData.imageAltText);
    }
    kv.setOnClickAction(
      CardService.newAction()
        .setFunctionName("pushCard")
        .setParameters({
          card: this.constructor.name,
          parameters: JSON.stringify(this._getParameters())
        })
    );
    return kv;
  }

  build() {
    const card = CardService.newCardBuilder();
    const header = CardService.newCardHeader();

    const headerData = this._getHeader();
    if (headerData.title) {
      header.setTitle(headerData.title);
    }
    if (headerData.imageUrl && headerData.imageAltText) {
      header.setImageUrl(headerData.imageUrl);
      header.setImageAltText(headerData.imageAltText);
    }
    card.setHeader(header);
    this._buildBody(card);
    return card.build();
  }

  _getParameters() {
    return [];
  }
}

class DatabaseSettingsCard extends MyCard {
  isEnabled() {
    return isLoggedIn();
  }

  _getHeader() {
    return {
      title: "Database Settings"
    };
  }

  _buildBody(card) {
    const dbs = loadDBs();

    dbs.forEach(db => {
      const section = CardService.newCardSection();
      section.setHeader(db.getName());

      db.getViews().forEach(view => {
        const settings = view.getSettings();
        section.addWidget(
          CardService.newKeyValue()
            .setContent(view.getName())
            .setBottomLabel("Use this view?")
            .setSwitch(
              CardService.newSwitch()
                .setFieldName(`db-settings-${view.getId()}-enabled`)
                .setSelected(settings.enabled)
                .setValue("1")
                .setOnChangeAction(
                  CardService.newAction()
                    .setParameters({
                      id: view.getId(),
                      dbId: db.getId(),
                      key: "enabled"
                    })
                    .setFunctionName("updateDBPreferences")
                )
            )
        );
      });
      card.addSection(section);
    });
  }
}

class UserCard extends MyCard {
  isEnabled() {
    return isLoggedIn();
  }

  _getHeader() {
    const prefs = getPreferences();
    return {
      title: "Your Profile",
      imageAltText: "Profile Picture",
      imageUrl: prefs.user_photo
    };
  }

  _buildBody(card) {
    const prefs = getPreferences();

    card.addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newKeyValue()
            .setContent(prefs.user_name)
            .setTopLabel("Name")
        )
        .addWidget(
          CardService.newKeyValue()
            .setContent(prefs.user_email)
            .setTopLabel("Email")
        )
        .addWidget(
          CardService.newKeyValue()
            .setContent(prefs.user_locale)
            .setTopLabel("Locale")
        )
        .addWidget(
          CardService.newKeyValue()
            .setContent(prefs.user_timezone)
            .setTopLabel("Timezone")
        )
        .addWidget(
          CardService.newTextParagraph().setText(
            "To refresh these settings, go to Account Settings and press the LOGIN button again."
          )
        )
    );
  }
}

class AccountSettingsCard extends MyCard {
  _getHeader() {
    return {
      title: "Account Settings"
    };
  }

  _buildBody(card) {
    const saveAction = CardService.newAction().setFunctionName(
      "savePreferences"
    );
    const deleteAction = CardService.newAction().setFunctionName(
      "deletePreferences"
    );

    card.addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextInput()
            .setFieldName("token_v2")
            .setTitle("token_v2 Cookie")
            .setValue(getPreferences().token_v2)
            .setHint(
              "Use Developer Tools to extract the token_v2 Cookie from your Notion page and paste it in here."
            )
        )
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText("Login")
                .setOnClickAction(saveAction)
                .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            )
            .addButton(
              CardService.newTextButton()
                .setText("Logout")
                .setOnClickAction(deleteAction)
                .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
                .setBackgroundColor("#f44336")
            )
        )
    );
  }
}

function editRowField(e) {
  return CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification().setText("not yet implemented")
    )
    .build();

  const { databaseId, viewId, field, rowId, controlName } = e.parameters;

  const formInputs = e.commonEventObject.formInputs;
  const formInput = formInputs ? formInputs[controlName] : undefined;

  const value = formInput ? formInput.stringInputs.value[0] : "";

  if (field.type === "checkbox") {
  }

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText("updated"))
    .build();
}

class TasksCard extends MyCard {
  constructor(databaseId, viewId) {
    super();
    this.databaseId = databaseId;
    this.viewId = viewId;
  }

  isEnabled() {
    return isLoggedIn();
  }

  _getHeader() {
    const db = NotionDB.fromId(this.databaseId, [this.viewId]);
    return {
      title: db.getName() + " · " + db.getView(this.viewId).getName(),
      imageUrl: db.getCover(),
      imageAltName: "Database Cover"
    };
  }

  _getParameters() {
    return [this.databaseId, this.viewId];
  }

  _buildBody(card) {
    const db = NotionDB.fromId(this.databaseId, [this.viewId]);
    const view = db.getView(this.viewId);

    const rows = db.getRowsForView(view);

    card.addSection(
      CardService.newCardSection().addWidget(
        CardService.newImage()
          .setAltText("Database Cover")
          .setImageUrl(db.getCover())
      )
    );

    rows.forEach(entry => {
      const section = CardService.newCardSection();
      // section.setCollapsible(true);
      // section.setNumUncollapsibleWidgets(0);

      Object.keys(entry.properties).forEach(fieldId => {
        const fieldValue = entry.properties[fieldId];
        const field = db.getField(fieldId);
        if (fieldId === "title") {
          section.setHeader("<font color=\"black\"><b>" + fieldValue + "</b></font>");
        } else {
          const kv = CardService.newKeyValue();
          if (field.type === "checkbox") {
            const controlName =
              "property-edit|" +
              this.databaseId +
              "|" +
              this.viewId +
              "|" +
              fieldId +
              "|" +
              entry.id;
            kv.setContent(field.name).setSwitch(
              CardService.newSwitch()
                .setControlType(CardService.SwitchControlType.CHECK_BOX)
                .setValue("1")
                .setFieldName(controlName)
                .setOnChangeAction(
                  CardService.newAction()
                    .setFunctionName("editRowField")
                    .setParameters({
                      databaseId: this.databaseId,
                      viewId: this.viewId,
                      field: JSON.stringify(field),
                      rowId: entry.id,
                      controlName
                    })
                )
                .setSelected(fieldValue)
            );
          } else {
            var content = fieldValue.toString();
            if (Array.isArray(fieldValue)) {
              content = fieldValue.join(", ");
            }
            kv.setTopLabel(field.name).setContent(content);
          }
          if (field.type === "url") {
            kv.setOpenLink(CardService.newOpenLink().setUrl(fieldValue));
          }
          section.addWidget(kv);
        }
      });
      if (Object.keys(entry.properties).length < 2) {
        section.addWidget(CardService.newTextParagraph().setText("---"));
      }

      card.addSection(section);
    });

    /*
    card.setFixedFooter(CardService.newFixedFooter()
                        .setPrimaryButton(CardService.newTextButton()
                                          .setText("Create Entry")
                                          .setOpenLink(CardService.newOpenLink()
                                                       .setUrl("https://github.com/cmfcmf"))))
                                                       */
  }
}
