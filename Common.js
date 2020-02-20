function onGmailMessage(e) {
  return CardService.newCardBuilder()
    .setDisplayStyle(CardService.DisplayStyle.PEEK)
    .setPeekCardHeader(CardService.newCardHeader().setTitle("ignore me"))
    .build();
}

function post(uri, data) {
  const token_v2 = getPreferences().token_v2;
  return JSON.parse(
    UrlFetchApp.fetch("https://www.notion.so/api/v3/" + uri, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(data),
      headers: {
        Cookie: "token_v2=" + token_v2
      }
    }).getContentText()
  );
}

function notionToJS(prop, value) {
  // Based on Code from notion-py by Jamie Alexandre,
  // licensed under the MIT license
  // https://github.com/jamalex/notion-py
  if (prop.type === "title" || prop.type === "text") {
    return value[0][0];
  }
  if (prop.type === "number") {
    return value[0][0].indexOf(".") > -1
      ? parseFloat(value[0][0])
      : parseInt(value[0][0]);
  }
  if (prop.type === "select") {
    return value[0][0];
  }
  if (prop.type === "multi_select") {
    return value[0][0].split(",").map(function(v) {
      return v.trim();
    });
  }
  if (
    prop.type === "email" ||
    prop.type === "phone_number" ||
    prop.type === "url"
  ) {
    return value[0][0];
  }
  if (prop.type === "checkbox") {
    return value[0][0] === "Yes";
  }
  return "not supported";
  /*
        if prop["type"] in ["person"]:
            val = (
                [self._client.get_user(item[1][0][1]) for item in val if item[0] == "‣"]
                if val
                else []
            )

    if prop["type"] in ["date"]:
    val = NotionDate.from_notion(val)

        if prop["type"] in ["file"]:
            val = (
                [
                    add_signed_prefix_as_needed(item[1][0][1], client=self._client)
                    for item in val
                    if item[0] != ","
                ]
                if val
                else []
            )
        if prop["type"] in ["relation"]:
            val = (
                [
                    self._client.get_block(item[1][0][1])
                    for item in val
                    if item[0] == "‣"
                ]
                if val
                else []
            )
        if prop["type"] in ["created_time", "last_edited_time"]:
            val = self.get(prop["type"])
            val = datetime.utcfromtimestamp(val / 1000)
        if prop["type"] in ["created_by", "last_edited_by"]:
            val = self.get(prop["type"])
            val = self._client.get_user(val)

        return val
  */
}

function isLoggedIn() {
  return !!getPreferences().token_v2;
}
