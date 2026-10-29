# What you see in the BTP cockpit after deploying a CAP app

Covers: the apps and instances ending in `-srv`, `-db`, `-db-deployer`, `-auth`, `-destination`, `-html5-repo-…`, plus **binding** and **service key**.

Legend: ✅ = standard behaviour. ⚠️ = inferred, not checked against your own deploy. Exact names come from the `mta.yaml` in your project, so open its `modules:` and `resources:` sections to confirm.

---

## 1. Five words first (one sentence each)

- **Application**: a program of yours that is running (or ran) in Cloud Foundry.
- **Service**: a ready-made thing SAP offers, like a database or a login system.
- **Service instance**: your own personal copy of a service, created for your app.
- **Binding**: a link between one app and one service instance, so the app gets the password automatically.
- **Service key**: a set of credentials you create by hand, so something *outside* Cloud Foundry can use the instance.

---

## 2. The analogy: an office building

Use this one picture for the whole lecture.

| BTP thing | In the office building |
|---|---|
| Cloud Foundry **space** | Your office floor |
| **Application** (`-srv`) | An employee who works at a desk all day |
| **Application** (`-db-deployer`) | A furniture installer: sets things up, then goes home |
| **Service instance** | A facility your floor subscribed to: a filing room, a security desk, a phone book |
| **Binding** | The access badge clipped to the employee's desk, so they walk into the filing room without asking |
| **Service key** | A visitor pass you print for a contractor working from home |

---

## 3. What each item is (for our app `customer-sales-orders`)

### In "Applications"

| Name | What it is | Normal state |
|---|---|---|
| `customer-sales-orders-srv` | Your CAP backend. The Node.js code that serves `CustomerService` and `PublicService` as OData. It has a URL. | **Started** ✅ |
| `customer-sales-orders-db-deployer` | A small helper app. It reads your `db/` folder and creates the tables, views and CSV data inside the database. Then it stops. | **Stopped**, and that is fine ✅ |
| `…-approuter` (only if you added one) | The front door. Handles login and forwards requests to `-srv`. | Started |

Beginners often panic that the db-deployer is "stopped". Tell them: the installer finished the job and went home.

### In "Service Instances"

| Name | Service (plan) | What it is |
|---|---|---|
| `customer-sales-orders-db` | `hana` (`hdi-shared`) | An **HDI container**: your own private schema (a walled-off area) inside the SAP HANA Cloud database. Your tables live here. |
| `customer-sales-orders-auth` ⚠️ older projects name it `-uaa` or `-xsuaa` | `xsuaa` (`application`) | The security desk. Handles login, roles and tokens. |
| `customer-sales-orders-destination` | `destination` (`lite`) | The phone book. Stores the addresses and logins of other systems (for example an S/4HANA system). |
| `customer-sales-orders-html5-repo-host` / `-runtime` | `html5-apps-repo` | A storage cupboard for your Fiori UI files, and the service that serves them. Only there if you have a UI. |
| `customer-sales-orders-connectivity` ⚠️ | `connectivity` | A tunnel to on-premise systems. Only if you added it. |

Note: the **SAP HANA Cloud instance itself** (the big database) is a different thing you create once. The `-db` instance is just your container *inside* it.

### How it maps to `mta.yaml` ✅

- `modules:` → become **applications** (`-srv`, `-db-deployer`, approuter, UI content).
- `resources:` → become **service instances** (`-db`, `-auth`, `-destination`, html5 repo).
- `requires:` under a module → becomes a **binding** between that app and that instance.

---

## 4. Binding vs service key

| | Binding | Service key |
|---|---|---|
| Who uses it | An app running **inside** Cloud Foundry (`-srv`) | Something **outside**: BAS hybrid testing, Postman, HANA Database Explorer, another system |
| How credentials arrive | Automatically, in the app's environment variable `VCAP_SERVICES` | You open the key and copy the JSON, or a tool reads it for you |
| Who creates it | The MTA deploy (from `requires:`) | You, by hand (or `cds bind` creates one for you ⚠️ behaviour checked from memory of capire, confirm on your version) |
| Where you see it | App → **Service Bindings**, or Instance → **Bound Applications** | Instance → **Service Keys** |
| CAP code needed | None. CAP reads `VCAP_SERVICES` by itself. | None for `cds bind`; Postman needs you to fetch a token with `clientid` + `clientsecret` + `url` |

Common uses of a service key:

1. **BAS hybrid testing**: `cds bind -2 customer-sales-orders-db` then `cds watch --profile hybrid`. Your code runs in BAS but talks to the real HANA container.
2. **Postman**: create a key on the `-auth` (xsuaa) instance, use its `clientid`, `clientsecret` and `url` to get a token, then call `-srv` with that token.
3. **Database Explorer**: connect to the HDI container and look at the tables.

Safety line for the lecture: a service key is a password. Don't share it, don't commit it to GitHub, delete it when you're done.

To see a binding's credentials from the terminal: `cf env customer-sales-orders-srv` ✅.

---

## 5. How to say it on camera (beginner narration)

> When you deploy a CAP app, [pause] the cockpit suddenly shows lots of new things.
> Don't worry. [pause] There are only two kinds.
> Applications, [pause] and service instances.
>
> Think of an office building.
> Your app ending in dash srv, [pause] is the employee. It works all day, and answers every request.
> The app ending in dash db-deployer, [pause] is the furniture installer.
> It builds your tables in the database, [pause] then goes home. That's why it shows stopped. That's normal.
>
> Now the service instances.
> These are the facilities your office subscribed to.
> Dash db, [pause] is your private filing room, inside SAP HANA Cloud.
> Dash auth, [pause] is the security desk. It checks who is logging in.
> Dash destination, [pause] is the phone book, with addresses of other systems.
>
> So how does the employee get into the filing room?
> With a badge, [pause] already clipped to their desk.
> That badge is called a binding.
> The app gets the database password automatically, [pause] and CAP reads it for you. No code.
>
> But what if someone outside the building needs to get in?
> Like you, [pause] testing from Business Application Studio, [pause] or from Postman?
> You print them a visitor pass.
> That is a service key.
> [pause]
> Binding, [pause] for apps inside. Service key, [pause] for anyone outside.

---

## 6. Interview version (30–45 seconds)

> "After an MTA deploy, each module in `mta.yaml` becomes a Cloud Foundry application and each resource becomes a service instance.
> For a CAP app, `-srv` is the Node.js service layer, and `-db-deployer` is the HDI deployer that creates the database artifacts in the HDI container and then stops.
> The instances are typically the HDI container (`hana`, `hdi-shared`), XSUAA for authentication and authorization, the destination service for remote system connections, and the HTML5 application repository if there's a UI.
> A binding connects an app to an instance and injects the credentials into `VCAP_SERVICES`, which CAP picks up automatically.
> A service key creates credentials for an external consumer that isn't bound, for example hybrid testing from BAS with `cds bind`, or getting an OAuth token from XSUAA for Postman."

Likely follow-up: *"Why is the db-deployer stopped?"* Because it is a one-time job. It runs on each deploy, pushes the schema, and exits. Running it all the time would waste memory.
