class NotionDB {
  constructor(db, viewIds) {
    this.db = db;
    this.viewIds = viewIds;
  }

  static fromId(id, viewIds) {
    const data = post("getRecordValues", {
      requests: [{ id: id, table: "collection" }]
    });
    return new NotionDB(data.results[0].value, viewIds);
  }

  getId() {
    return this.db.id;
  }

  getName() {
    const icon = this.db.icon;
    const name = notionToJS({ type: "title" }, this.db.name);
    return icon ? `${icon} ${name}` : name;
  }

  getCover() {
    return this.db.cover;
  }

  getFields() {
    return Object.entries(this.db.schema).map(([id, field]) => {
      return {
        id: id,
        name: field.name,
        type: field.type
      };
    });
  }

  getField(id) {
    return this.getFields().find(each => each.id === id);
  }

  getViews() {
    const data = post("getRecordValues", {
      requests: this.viewIds.map(viewId => ({
        id: viewId,
        table: "collection_view"
      }))
    });
    return data.results.map(each => new NotionView(each.value));
  }

  getView(id) {
    return this.getViews().find(each => each.getId() === id);
  }

  getRowsForView(view) {
    const prefs = getPreferences();

    const data = post("queryCollection", {
      collectionId: this.getId(),
      collectionViewId: view.getId(),
      loader: {
        limit: 100, // Google does not allow cards with more than 100 sections anyways
        loadContentCover: true,
        searchQuery: "",
        type: "table",
        userLocale: prefs.user_locale,
        userTimeZone: prefs.user_timezone
      },
      query: view.getQuery()
    });

    return Object.values(data.recordMap.block).flatMap(block => {
      block = block.value;
      if (block.type !== "page" || block.properties === undefined) {
        return [];
      }

      const row = {
        id: block.id,
        properties: {}
      };
      Object.keys(block.properties).forEach(fieldId => {
        const value = block.properties[fieldId];
        const field = this.getField(fieldId);
        if (field === undefined) {
          // FIXME: Why does this happen?
          return;
        }
        row.properties[fieldId] = notionToJS(field, value);
      });

      return [row];
    });
  }
}

function loadDBs() {
  const data = post("loadUserContent");
  const views = Object.values(data.recordMap.block).map(each => each.value);
  return Object.values(data.recordMap.collection)
    .map(each => each.value)
    .map(db => {
      return {
        db: db,
        viewIds: views.find(view => view.collection_id === db.id).view_ids
      };
    })
    .map(each => new NotionDB(each.db, each.viewIds));
}

function loadView(id) {
  const dbs = loadDBs();
  for (const db of dbs) {
    for (const view of db.getViews()) {
      if (view.getId() === id) {
        return view;
      }
    }
  }
}

function updateDBPreferences(e) {
  const { id, dbId, key } = e.parameters;
  const formInputs = e.commonEventObject.formInputs;
  const formInput = formInputs
    ? formInputs[`db-settings-${id}-${key}`]
    : undefined;
  const value = formInput ? formInput.stringInputs.value[0] === "1" : false;

  SettingsManager.updateViewSettings(id, { databaseId: dbId, [key]: value });

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText("saved"))
    .build();
}

class SettingsManager {
  static getAllViewSettings() {
    return getPreferences().dbSettings;
  }

  static getViewSettings(id) {
    return {
      enabled: false,
      databaseId: undefined,
      ...SettingsManager.getAllViewSettings()[id]
    };
  }

  static updateViewSettings(id, update) {
    const newSettings = {
      ...SettingsManager.getAllViewSettings(),
      [id]: {
        ...SettingsManager.getViewSettings(id),
        ...update
      }
    };
    PropertiesService.getUserProperties().setProperty(
      "dbSettings",
      JSON.stringify(newSettings)
    );
  }
}

class NotionView {
  constructor(view) {
    this.view = view;
  }

  getId() {
    return this.view.id;
  }

  getName() {
    return this.view.name;
  }

  getQuery() {
    return this.view.query2;
  }

  getSettings() {
    return SettingsManager.getViewSettings(this.getId());
  }
}
