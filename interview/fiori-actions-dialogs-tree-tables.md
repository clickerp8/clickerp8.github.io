# Interview answers: Fiori Elements actions, dialogs and tree tables

Each question has a **short spoken answer** (what to say in 30–60 seconds) and **deeper detail** (if the interviewer digs in).

Legend: ✅ = standard, well-established behaviour. ⚠️ = depends on UI5 / CAP version, check the current docs (ui5.sap.com "SAP Fiori Elements" and capire) before quoting exact syntax.

---

## Question 1: How does an action trigger a dialog? Can a button exist without an action and still open a dialog?

### Short spoken answer

> "In CAP I define an action in the service, either bound to an entity or unbound.
> Then I add an annotation, `UI.DataFieldForAction`, in `UI.LineItem` for a table toolbar button, or in `UI.Identification` for an Object Page header button.
> Fiori Elements reads that annotation and draws the button for me.
> If the action has parameters, Fiori Elements automatically opens a dialog with one input field per parameter. I don't write any UI code for that.
> If there are no parameters but I want a confirmation popup, I mark the action with `Common.IsActionCritical`.
>
> And yes, a button can exist without any backend action.
> I add a custom action in `manifest.json`, point its `press` to a handler in an extension controller, and in that handler I open my own dialog from an XML fragment.
> From that dialog I can stay purely on the UI, or call a backend action or function with `editFlow.invokeAction`."

### Deeper detail

**Term first:** an *action* is a custom operation on your service that can change data (like "Cancel order"). A *function* is the same idea but read-only. *Bound* means it works on one specific record. *Unbound* means it works on the service as a whole.

#### Step 1 – Define the action in CDS ✅

```cds
service CustomerService {
  entity Orders as projection on sales.Orders actions {
    action cancelOrder(reason : String @title: 'Reason') returns Orders;   // bound
  };
  action recalculateTotals();                                            // unbound
}
```

#### Step 2 – Implement it in Node.js ✅

```js
module.exports = cds.service.impl(function () {
  this.on('cancelOrder', 'Orders', async req => {
    const { ID } = req.params[0];
    await UPDATE('sales.Orders', ID).with({ status: 'Cancelled', note: req.data.reason });
    return SELECT.one.from('sales.Orders', ID);
  });
});
```

#### Step 3 – Annotate so the button appears ✅

```cds
annotate CustomerService.Orders with @(
  UI.LineItem: [
    { Value: orderNumber },
    { Value: status, Criticality: statusCriticality },
    { $Type: 'UI.DataFieldForAction',                 // toolbar button on the List Report table
      Action: 'CustomerService.cancelOrder', Label: 'Cancel Order' },
    { $Type: 'UI.DataFieldForAction',                 // unbound: note the EntityContainer path
      Action: 'CustomerService.EntityContainer/recalculateTotals', Label: 'Recalculate' }
  ],
  UI.Identification: [                                 // button in the Object Page header
    { $Type: 'UI.DataFieldForAction',
      Action: 'CustomerService.cancelOrder', Label: 'Cancel Order' }
  ]
);
```

- In `UI.LineItem` the button sits in the table toolbar. For a bound action, the user must select a row first.
- Add `Inline: true` to show the button inside each row instead. ✅
- In `UI.Identification` the button sits in the Object Page header. ✅

#### How the dialog appears ✅

- **Action has parameters** → Fiori Elements builds the dialog automatically. One field per parameter. Labels come from `@title` / `@Common.Label` on the parameter.
- Add value help to a parameter with `@Common.ValueList`. Make it mandatory with `@mandatory` (CAP) / `@FieldControl: #Mandatory`. ⚠️ (exact CAP shorthand depends on version)
- Pre-fill a parameter with `@UI.ParameterDefaultValue`. ⚠️
- **No parameters, but want "Are you sure?"** → `annotate CustomerService.Orders actions { cancelOrder @Common.IsActionCritical; }` ✅
- **Enable/disable the button** → `@Core.OperationAvailable` with a path or expression, for example only when status is not "Cancelled". ⚠️ (expression syntax varies by CAP version)
- **Refresh the screen after the action** → `@Common.SideEffects: { TargetProperties: ['in/status'] }` on the action. ✅

#### Button WITHOUT a backend action ✅

This is called a **custom action**. You define it in `manifest.json`, not in CDS.

```json
"OrdersList": {
  "options": { "settings": {
    "controlConfiguration": {
      "@com.sap.vocabularies.UI.v1.LineItem": {
        "actions": {
          "openNoteDialog": {
            "press": "sales.orders.ext.controller.OrderActions.openNoteDialog",
            "text": "Add Note",
            "enabled": "sales.orders.ext.controller.OrderActions.isEnabled",
            "requiresSelection": true
          }
        }
      }
    }
  } }
}
```

For an Object Page header button, the same idea goes under `"content": { "header": { "actions": { ... } } }`. ✅

The handler opens a fragment dialog:

```js
sap.ui.define(["sap/m/MessageToast"], function (MessageToast) {
  "use strict";
  return {
    openNoteDialog: async function (oContext, aSelectedContexts) {
      // In FE V4, "this" is the ExtensionAPI
      this._dialog ??= await this.loadFragment({
        id: "noteDialog",
        name: "sales.orders.ext.fragment.NoteDialog",
        controller: this
      });
      this._dialog.open();
    }
  };
});
```

From the dialog's OK button you can:
- do pure UI work (show info, validate input, navigate), or
- call the backend: `this.editFlow.invokeAction("CustomerService.cancelOrder", { contexts: aSelectedContexts, parameterValues: [{ name: "reason", value: sReason }] })`, or bind a function with the OData V4 model. ⚠️ (check the `invokeAction` signature for your UI5 version)

**Tip to mention:** SAP Fiori tools (Page Map / Guided Development in BAS) generates the custom action, handler file and manifest entry for you.

**Bigger customisations** use a **controller extension**: a class registered in `manifest.json` under `sap.ui5 > extends > extensions > sap.ui.controllerExtensions`, which can `override` lifecycle hooks like `onInit` or `editFlow.onBeforeSave`. ✅

---

## Question 2: Is a tree table with different colours possible in Fiori Elements? If not, how would you build it?

### Short spoken answer

> "Yes, mostly. Fiori Elements for OData V4 supports tree tables in the List Report and Object Page.
> The backend must expose a hierarchy, using the `Aggregation.RecursiveHierarchy` and `Hierarchy.RecursiveHierarchy` annotations, and in `manifest.json` I set the table type to `TreeTable` with the hierarchy qualifier.
> For colours, Fiori Elements uses **criticality**: `Criticality` on a column colours the cell, and `UI.Criticality` on the LineItem shows a coloured highlight bar on each row.
> Those are semantic colours: red, orange, green, blue, neutral. Not any colour I like.
>
> If the requirement needs custom colours, or the backend can't support hierarchy queries, my thought process is:
> first check whether criticality is enough, then try a custom column with a fragment, then a building block in a flexible programming model page,
> and only as a last resort a freestyle UI5 `sap.ui.table.TreeTable` with formatters and row highlights."

### Deeper detail

**Term first:** a *tree table* shows parent and child rows that you can expand and collapse, like folders. A *hierarchy* is data where each row points to its parent (for example, product category → sub-category).

#### Standard Fiori Elements tree table ⚠️ (needs recent UI5 and CAP)

1. Data model: each row has a link to its parent.
   ```cds
   entity Categories : cuid {
     name     : String;
     parent   : Association to Categories;
     children : Association to many Categories on children.parent = $self;
   }
   ```
2. Annotate the hierarchy (the qualifier name is your choice):
   ```cds
   annotate CatalogService.Categories with @Aggregation.RecursiveHierarchy #CategoryTree: {
     ParentNavigationProperty: parent,
     NodeProperty            : ID
   };
   ```
   Plus `@Hierarchy.RecursiveHierarchy #CategoryTree` with the helper fields (`DrillState`, `DistanceFromRoot`, `LimitedDescendantCount`, `Matched`, …).
3. `manifest.json`:
   ```json
   "tableSettings": { "type": "TreeTable", "hierarchyQualifier": "CategoryTree" }
   ```
4. The backend must answer OData `$apply` hierarchy queries (`TopLevels`, `descendants`, `ancestors`). Recent CAP versions support this for Fiori tree tables; ABAP RAP supports it too. **Check capire "Hierarchies / Tree Tables" for your CAP version and database** (HANA vs. SQLite) before claiming it in an interview.

#### Colours with criticality ✅

**Term first:** *criticality* is a number that tells Fiori how important or risky a value is. Fiori turns it into a colour.

| Value | Meaning | Colour |
|---|---|---|
| 0 | Neutral | Grey |
| 1 | Negative | Red |
| 2 | Critical | Orange |
| 3 | Positive | Green |
| 5 | Information | Blue ⚠️ (newer versions) |

```cds
annotate CustomerService.Orders with @(
  UI.LineItem: [
    { Value: status, Criticality: statusCriticality }   // cell: coloured text + icon
  ],
  UI.LineItem.@UI.Criticality: statusCriticality         // row: coloured bar on the left
);
```

Compute `statusCriticality` in the service (a calculated element or in an `after READ` handler).

#### Fallback thought process (say this out loud in an interview)

1. **Clarify the requirement.** What do the colours mean? Status? Levels in the tree? Does the business really need full-row background colours, or is a status highlight enough? (Fiori design guidelines prefer semantic colours.)
2. **Standard first.** Hierarchy annotations + criticality. Zero custom code, upgrade-safe.
3. **Custom column.** Add a column via `manifest.json` (`controlConfiguration > columns`) with an XML fragment, for example an `ObjectStatus` or `Icon` with a formatter-driven `state`.
4. **Building block / flexible programming model.** Use `macros:Table` (which can also be a tree table ⚠️) inside a custom section or custom page, keeping Fiori Elements behaviour but more layout control.
5. **Freestyle last.** `sap.ui.table.TreeTable` in a custom section or freestyle app. Use `rowSettingsTemplate` with `highlight` bound to a formatter. `highlight` accepts `Success`, `Warning`, `Error`, `Information` and `Indication01`–`Indication08`, which gives you up to 8 extra theme-safe colours without CSS hacks. Use a custom CSS class only if nothing else works, because it can break on theme changes.

---

## Improvement plan: UI + UI-to-backend integration

Goal: confidently explain and build "CAP service → annotations → Fiori Elements → extension" end to end. About 2 weeks at 1 hour a day.

| # | Topic | What to practise | Done when you can… |
|---|---|---|---|
| 1 | OData V4 basics | `$metadata`, `$expand`, `$filter`, how annotations appear in metadata | read an annotation in `$metadata` and say which UI element it drives |
| 2 | Core UI annotations | `LineItem`, `SelectionFields`, `HeaderInfo`, `Facets`, `FieldGroup`, `ValueList`, `Criticality` | build a List Report + Object Page with no JS |
| 3 | Actions & functions | bound/unbound, parameters dialog, `IsActionCritical`, `OperationAvailable`, `SideEffects` | add 3 kinds of buttons and explain each dialog |
| 4 | Draft & validation | `@odata.draft.enabled`, `req.error` in `before SAVE`, messages shown on fields | show a field-level error message from the backend |
| 5 | Extensions | custom action, custom column, custom section, fragment dialog, controller extension, `ExtensionAPI` / `editFlow` | open your own dialog and call a CAP action from it |
| 6 | Tree tables & colours | hierarchy annotations, criticality, freestyle `TreeTable` with highlight | show the same data as an FE tree and a freestyle tree |
| 7 | Debugging the integration | browser Network tab (`$batch`), UI5 Diagnostics (Ctrl+Shift+Alt+S), `cds watch` logs | explain why a button is missing or greyed out |

**Interview habit:** for any UI question, answer in this order: *annotation (standard) → manifest setting → extension → freestyle*. That order is exactly what interviewers want to hear.

---

## Suggested hands-on demo repo

Name idea: **`cap-fiori-actions-tree-demo`** (private, under clicksap2026, created empty by you, same as the earlier demos).

Built on the `sales` model (Customers, Orders, OrderItems) plus a small `Categories` hierarchy. One branch per step:

1. `step-01-actions` – bound `cancelOrder(reason)` with auto dialog, unbound `recalculateTotals`, critical action confirmation.
2. `step-02-button-states` – `OperationAvailable` + `SideEffects`.
3. `step-03-custom-action` – manifest custom button + fragment dialog that calls the CAP action via `editFlow.invokeAction`.
4. `step-04-criticality` – status colours on cells and rows.
5. `step-05-tree-table` – Fiori Elements tree table on Categories.
6. `step-06-freestyle-tree` – custom section with `sap.ui.table.TreeTable` and `Indication01–08` row highlights.
