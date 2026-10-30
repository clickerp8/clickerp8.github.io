# Connect Your CAP App to SAP S/4HANA: Customer Notes

Most real SAP apps don't live alone. They use data that already sits in SAP S/4HANA, like customers, products or orders.

In this guide, we build a small app that reads customers from S/4HANA and adds our own notes to them. And you don't need an S/4HANA system. We start with test data, then connect to SAP's free sandbox.

You can follow it with no SAP or coding background. Every new word gets a one-line explanation.

Prefer to watch? The full video walkthrough is here: [clickERP on YouTube](https://www.youtube.com/@clickERP)

## The use case

Sales reps want to keep their own notes about customers. Things like "asked for a quote, call back Friday".

The customers already exist in S/4HANA. We must not copy them, and we must not change S/4HANA. Here is what the sales team needs:

1. Store notes, each one linked to an S/4HANA customer.
2. See the list of customers from S/4HANA.
3. See each note with the customer's name next to it.

We build that app in this guide.

## Words you need first

- **SAP S/4HANA:** SAP's ERP system. It holds a company's customers, orders, stock and finance.
- **Business partner:** S/4HANA's name for a customer, a supplier, or any person or company the business works with. Each one has a number, like `1000001`.
- **API:** a set of web addresses that another program can call to read or change data.
- **SAP Business Accelerator Hub:** SAP's free website at [api.sap.com](https://api.sap.com), where you can find every SAP API, download it, and test it.
- **Sandbox:** a free test copy of S/4HANA that SAP runs for everyone. You can read its data, but you can't change it.
- **Remote service:** in CAP, a service that lives in another system. Our app calls it over the internet.
- **Mock:** fake test data that stands in for the real system while you develop.

## How the app is built

Our app has two kinds of data, and they live in different places.

- **Notes** live in **our** database. We own them, so we can create and change them.
- **Business partners** live in **S/4HANA**. We only read them, through the Business Partner API.

Each note stores only the business partner **number**. When someone reads the notes, our app asks S/4HANA for the names and adds them to the answer.

## Before you start

You need three free things.

- **An SAP BTP trial account** and **SAP Business Application Studio (BAS)**. If you don't have them yet, follow [Set Up Your Free SAP BTP Trial](00-btp-trial-setup.html) first.
- **A free account on [api.sap.com](https://api.sap.com).** Log in with the same SAP account. We need it to download the API and get an API key.

In BAS, open your dev space of type *Full Stack Cloud Application*.

## Step 1: Create the project

Open a terminal in BAS. First, create the project:

```bash
cds init cap-s4-customer-notes --nodejs
```

Then go into the new project folder:

```bash
cd cap-s4-customer-notes
```

Then start the app:

```bash
cds watch
```

`cds watch` starts the app and restarts it every time you save a file. It says "no models found" for now. Keep it running.

## Step 2: Describe the notes

In the `db` folder, create a file called `schema.cds`:

```cds
namespace notes;

using { cuid, managed } from '@sap/cds/common';

// A sales rep's own note about a customer in S/4HANA
entity Notes : cuid, managed {
  bpNumber : String(10)  @title: 'Business partner' @mandatory;  // the S/4HANA business partner number
  text     : String(500) @title: 'Note' @mandatory;
  followUp : Date        @title: 'Follow up on';
  author   : String(100) @title: 'Sales rep';
}
```

Here's what's new.

- `bpNumber` holds only the business partner **number**. We don't copy the customer's name or address. S/4HANA stays the one place for customer data.
- `@title` is the label that screens show for the field, like "Sales rep" instead of "author".
- `@mandatory` means the field can't be empty. A note without a text or a customer is refused.

Now add sample notes. In `db`, create a folder called `data`, and in it a file called `notes-Notes.csv`. The name must be the namespace, a dash, then the entity name.

```csv
ID;bpNumber;text;followUp;author
a1000000-0000-4000-8000-000000000001;1000000;Asked for a quote on 200 units. Call back Friday.;2026-10-16;Anita Rao
a1000000-0000-4000-8000-000000000002;1000001;Unhappy with the last delivery date. Offer a discount.;2026-10-20;Ben Carter
a1000000-0000-4000-8000-000000000003;1000002;Interested in the new service contract.;2026-10-23;Anita Rao
a1000000-0000-4000-8000-000000000004;1000000;Sent the quote by email.;;Anita Rao
```

## Step 3: Expose the notes with a service

In the `srv` folder, create a file called `notes-service.cds`:

```cds
using notes from '../db/schema';

service CustomerNotesService {
  entity Notes as projection on notes.Notes;
}
```

Save, and open the link for port 4004 that BAS shows. Click **Notes**, and you see the four notes.

They only show a number like `1000001`, though. Nobody knows which customer that is. That's the problem we solve next.

## Step 4: Download the Business Partner API

1. Go to [api.sap.com](https://api.sap.com) and log in.
2. Search for **Business Partner (A2X)**. Its technical name is `API_BUSINESS_PARTNER`.
3. Open it, go to **API Specification**, and download the **EDMX** file.

An **EDMX** file describes an API: which entities it has, and which fields each one has. It holds no data.

In BAS, drag the downloaded `API_BUSINESS_PARTNER.edmx` into your project folder.

## Step 5: Import the API into CAP

In the terminal, stop `cds watch` with **Ctrl+C**. Then run:

```bash
cds import API_BUSINESS_PARTNER.edmx
```

CAP does two things for you:

- It creates the folder `srv/external` with the API's model, so CAP knows every entity and field in it.
- It adds the API to `package.json`, under `cds.requires`. That's CAP's list of the other systems our app talks to.

Open `package.json` and look for this part:

```json
"cds": {
  "requires": {
    "API_BUSINESS_PARTNER": {
      "kind": "odata-v2",
      "model": "srv/external/API_BUSINESS_PARTNER"
    }
  }
}
```

`odata-v2` means S/4HANA speaks an older version of OData. CAP translates for us, so our own app still speaks OData V4.

Start the app again with `cds watch`.

## Step 6: Show business partners in our service

The API has hundreds of fields. We only need a few. Replace `srv/notes-service.cds` with this:

```cds
using notes from '../db/schema';
using { API_BUSINESS_PARTNER as S4 } from './external/API_BUSINESS_PARTNER';

service CustomerNotesService {

  entity Notes as projection on notes.Notes {
    *,
    virtual partnerName : String(81) @title: 'Customer'   // filled from S/4HANA
  };

  // Business partners, read live from S/4HANA
  @readonly entity BusinessPartners as projection on S4.A_BusinessPartner {
    key BusinessPartner         as ID,
        BusinessPartnerFullName as name,
        BusinessPartnerCategory as category,
        Industry                as industry,
        CreationDate            as createdOn
  };
}
```

Here's what each part means.

- `using { API_BUSINESS_PARTNER as S4 }` loads the imported API and gives it a short name, `S4`.
- `A_BusinessPartner` is the API's entity for business partners.
- `as name`, `as industry` give the long S/4HANA field names short, friendly names.
- `@readonly` means our app can only read business partners. We never change S/4HANA.
- A **virtual** field is a field that is not stored in the database. `partnerName` is empty for now. Our code fills it in Step 8.

## Step 7: Add test data for S/4HANA

We have no S/4HANA system yet. So we give CAP some test business partners.

In `srv/external`, create a folder called `data`, and in it a file called `API_BUSINESS_PARTNER-A_BusinessPartner.csv`:

```csv
BusinessPartner;BusinessPartnerFullName;BusinessPartnerCategory;Industry;CreationDate
1000000;Inlandkunde DE 1;2;RETAIL;2017-01-12
1000001;Domestic US Customer 1;2;RETAIL;2017-03-04
1000002;Domestic Customer GB 1;2;SERVICE;2018-05-21
1000003;Domestic Customer IN 1;2;MANUF;2019-08-30
1000004;Domestic Customer JP 1;2;MANUF;2020-02-14
```

Save. In the terminal you now see this line:

```
[cds] - mocking API_BUSINESS_PARTNER
```

`cds watch` noticed that we have no real S/4HANA connection. So it **mocks** the API: it runs a fake copy of it, filled with our test data. This means you can build and test everything offline.

## Step 8: Add the customer name to each note

Now we write a little code. In `srv`, create a file called `notes-service.js`. It has the same name as `notes-service.cds`, so CAP connects them automatically.

```js
import cds from '@sap/cds'

export default class CustomerNotesService extends cds.ApplicationService { async init() {

  console.log('🗒️  CustomerNotesService is starting')

  const { Notes, BusinessPartners } = this.entities
  const S4 = await cds.connect.to('API_BUSINESS_PARTNER')
  const target = S4.options.credentials?.url ?? 'the local mock (no URL configured)'
  console.log(`🔌 Connected to API_BUSINESS_PARTNER → ${target}`)

  // Business partners are not in our database: ask S/4HANA
  this.on('READ', BusinessPartners, async (req) => {
    console.log('\n🏢 GET /BusinessPartners: these are not in our database')
    console.log('   1. Forwarding the same query to S/4HANA')
    const result = await S4.run(req.query)
    const count = Array.isArray(result) ? result.length : (result ? 1 : 0)
    console.log(`   2. S/4HANA answered with ${count} business partner(s). Sending them back ✓`)
    return result
  })

  // Add the customer name from S/4HANA to each of our notes
  this.after('READ', Notes, async (result) => {
    const notes = (Array.isArray(result) ? result : [result]).filter(n => n?.bpNumber)
    if (!notes.length) return
    console.log(`\n🗒️  GET /Notes: CAP read ${notes.length} note(s) from OUR database`)
    console.log('   AFTER handler: the notes only have a partner number, so we ask S/4HANA for the names')
    const names = {}
    for (const id of new Set(notes.map(n => n.bpNumber))) {
      const partner = await S4.run(SELECT.one.from(BusinessPartners, id).columns('name'))
      names[id] = partner?.name
      console.log(`   • Partner ${id} → ${partner?.name ?? 'not found in S/4HANA'}`)
    }
    for (const n of notes) n.partnerName = names[n.bpNumber]
    console.log('   Done: every note now shows its customer name ✓')
  })

  console.log('🗒️  CustomerNotesService is ready')
  return super.init()
}}
```

What each piece means:

| Code | Meaning |
| --- | --- |
| `cds.connect.to('API_BUSINESS_PARTNER')` | Connect to S/4HANA, using the settings in `package.json`. |
| `this.on('READ', BusinessPartners, ...)` | "When someone reads business partners, run this code **instead** of reading our database." |
| `S4.run(req.query)` | Send the same question to S/4HANA, and give back its answer. |
| `this.after('READ', Notes, ...)` | "**After** CAP has read the notes from our database, run this code." |
| `n.partnerName = ...` | Fill the virtual field with the name from S/4HANA. |
| `return super.init()` | Always the last line. It finishes the setup. |

A **handler** is the code that runs when something happens in your service. An `on` handler replaces CAP's normal work. An `after` handler adds to it.

## Step 9: Test it with test.http

In the project folder, create a file called `test.http`:

```http
@server = http://localhost:4004

### All notes
GET {{server}}/odata/v4/customer-notes/Notes

### Add a note
POST {{server}}/odata/v4/customer-notes/Notes
Content-Type: application/json

{ "bpNumber": "1000003", "text": "First meeting went well.", "author": "Ben Carter" }

### Business partners from S/4HANA (mock data, or the SAP sandbox with --profile sandbox)
GET {{server}}/odata/v4/customer-notes/BusinessPartners?$top=5

### One business partner
GET {{server}}/odata/v4/customer-notes/BusinessPartners('1000001')

### Our notes, now with the customer name from S/4HANA
GET {{server}}/odata/v4/customer-notes/Notes?$select=bpNumber,partnerName,text
```

Click **Send Request** above each block. The last one now shows each note with its customer:

```json
{ "bpNumber": "1000001", "partnerName": "Domestic US Customer 1", "text": "Unhappy with the last delivery date. Offer a discount." }
```

Watch the terminal while you send requests. The `console.log` lines show when the app reads its **own** database, and when it asks **S/4HANA**.

## Step 10: Connect to the real SAP sandbox

Now we swap the test data for a real S/4HANA system: SAP's free sandbox.

First, tell CAP where the sandbox is. In `package.json`, add a `[sandbox]` part to `API_BUSINESS_PARTNER`:

```json
"cds": {
  "requires": {
    "API_BUSINESS_PARTNER": {
      "kind": "odata-v2",
      "model": "srv/external/API_BUSINESS_PARTNER",
      "[sandbox]": {
        "credentials": {
          "url": "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BUSINESS_PARTNER"
        }
      }
    }
  }
}
```

A **profile** is a named group of settings. `[sandbox]` settings are used only when you start the app with the sandbox profile.

Next, get your **API key**. On [api.sap.com](https://api.sap.com), open the Business Partner API and click **Show API Key**. The API key is your personal password for the sandbox.

Your key must never go to GitHub. So put it in its own file, called `.cdsrc-private.json`, in the project folder:

```json
{
  "requires": {
    "API_BUSINESS_PARTNER": {
      "[sandbox]": {
        "credentials": {
          "headers": { "APIKey": "<paste your API key from api.sap.com here>" }
        }
      }
    }
  }
}
```

Then open `.gitignore` and make sure it has this line:

```
.cdsrc-private.json
```

Stop `cds watch` and start it with the sandbox profile:

```bash
cds watch --profile sandbox
```

The terminal now says `Connected to API_BUSINESS_PARTNER → https://sandbox.api.sap.com/...`. Send the requests in `test.http` again. The business partners now come from SAP's sandbox.

Two things to know:

- The sandbox is **read-only**. Reading business partners works. Creating or changing them doesn't.
- The sandbox has its own data, so the names may differ from our test data. If a note's number doesn't exist there, its customer name stays empty.

Your notes are stored in your own app, so adding notes works in every mode.

## Common mistakes

- Running `cds import` while `cds watch` is still running: stop it first with Ctrl+C.
- Test data file in the wrong place or with the wrong name: it must be `srv/external/data/API_BUSINESS_PARTNER-A_BusinessPartner.csv`.
- Handler file named differently from the `.cds` file: `notes-service.cds` needs `notes-service.js`.
- Forgetting `return super.init()`: nothing works.
- 401 error from the sandbox: the API key is missing or wrong in `.cdsrc-private.json`.
- Your API key on GitHub: always keep `.cdsrc-private.json` in `.gitignore`.

## Your challenge

Add `category` to the business partner list, and show "Person" or "Organization" instead of 1 or 2. In S/4HANA, category 1 is a person and category 2 is an organization. Try it, then share how it went in the video's comments.

## What's next

You connected a CAP app to SAP S/4HANA, without touching S/4HANA and without copying its data. That's what SAP calls a **side-by-side extension**, and it's how clean core apps are built.

Watch me build it step by step on YouTube: [clickERP on YouTube](https://www.youtube.com/@clickERP)

Next guide: Book Lending, with your own actions and functions in CAP.
