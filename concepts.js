// Concept of the day: one term per day, picked by the date.
const CONCEPTS = [
  ["ERP", "One system that the whole company shares: sales, purchase, warehouse, finance and HR.", "Without ERP, the same customer gets typed into three different files."],
  ["SAP BTP", "SAP's cloud platform, where you build and run your own apps right next to SAP.", "Like a shopping mall: SAP gives the building and security, you open your shop."],
  ["SAP CAP", "SAP's toolkit for building business apps on BTP, with much less code.", "You describe your data, and CAP gives you a database table and an API for it."],
  ["Clean Core", "Keeping the SAP system itself unchanged, and building your extras outside it.", "Custom code moves to BTP, so SAP upgrades stay fast and safe."],
  ["CDS", "Core Data Services: the simple language CAP uses to describe your data and services.", "entity Customers { key ID : UUID; name : String; }"],
  ["Entity", "One kind of thing your app stores, like Customers or Orders. CAP turns it into a table.", "Customers is an entity. Acme Corp is one record in it."],
  ["Key", "The field that makes each record unique, so no two records get mixed up.", "An order number like ORD-2026-001 can be a key."],
  ["UUID", "A long random ID that CAP creates for you, so every record is unique.", "Looks like 3f2b8c1e-…. You never type it yourself."],
  ["Namespace", "A prefix that groups your entities, so their names never clash with anyone else's.", "namespace sales; makes the table sales.Customers."],
  ["Service", "The part of a CAP app that decides which data the outside world can see and use.", "CustomerService shows Customers and Orders, but hides internal fields."],
  ["Projection", "A view of an entity inside a service, showing all of it or only some fields.", "entity Customers as projection on sales.Customers;"],
  ["OData", "A standard way to read and change data over the web, using simple web addresses.", "Opening /odata/v4/customer/Customers in a browser lists all customers."],
  ["cds watch", "The command that runs your CAP app and restarts it every time you save a file.", "Type cds watch, then open the link it prints."],
  ["CSV data", "A simple text file with commas between values, used to load sample data into your app.", "db/data/sales-Customers.csv fills the Customers table at start."],
  ["Aspect", "A ready-made group of fields you can add to any entity in one word.", "managed adds createdAt, createdBy, modifiedAt and modifiedBy."],
  ["cuid", "An aspect that gives your entity a UUID key called ID, automatically.", "entity Orders : cuid { … } means no key to write yourself."],
  ["Enum", "A fixed list of allowed values for a field.", "status can only be New, Shipped or Cancelled."],
  ["Association", "A link from one entity to another, like a pointer.", "Each order points to one customer."],
  ["Composition", "A link where the child cannot live without its parent.", "Delete an order, and its order items are deleted too."],
  ["Deep insert", "Creating a parent and all its children in one single request.", "One call creates an order together with three order items."],
  ["Fiori Elements", "SAP's ready-made screens, drawn automatically from your service and a few annotations.", "A full list page and detail page, with no UI code."],
  ["Annotation", "A small note in CDS that tells Fiori how to show a field or a screen.", "@title: 'Customer Name' puts a nice label on the column."],
  ["SAP BAS", "SAP Business Application Studio: the online code editor where you build CAP apps.", "It runs in your browser. Nothing to install."],
  ["SQLite", "A small database that CAP uses while you develop, so you can start in seconds.", "In production the same model runs on SAP HANA Cloud."],
  ["SAP HANA Cloud", "SAP's cloud database, where your CAP app stores data in production.", "Your CDS model does not change when you move from SQLite to HANA."],
  ["Service instance", "Your own personal copy of a BTP service, created for your app.", "Your app gets its own HANA database instance."],
  ["Binding", "A link between your app and a service instance, so the app gets the password automatically.", "Bind the app to the database, and it just connects."],
  ["LLM", "A large language model: a program trained on huge amounts of text, so it can read and write language.", "Claude, GPT and Gemini are LLMs."],
  ["Embedding", "A list of numbers that captures the meaning of a text, so similar texts get similar numbers.", "\"bill is wrong\" and \"invoice incorrect\" land close together."],
  ["RAG", "Retrieval-augmented generation: find the right documents first, then let the LLM answer from them.", "The AI answers from your company's policies, not from guesswork."],
  ["Joule", "SAP's AI assistant, built into SAP apps and Business Application Studio.", "Ask Joule to generate a CDS model from a description."]
];

(function () {
  const day = Math.floor(Date.now() / 86400000);
  let i = day % CONCEPTS.length;
  const show = (label) => {
    const [term, def, eg] = CONCEPTS[i];
    document.getElementById("c-term").textContent = term;
    document.getElementById("c-def").textContent = def;
    document.getElementById("c-eg").textContent = "Example: " + eg;
    document.getElementById("c-date").textContent = label;
  };
  show("Today · " + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
  document.getElementById("c-next").addEventListener("click", () => {
    i = (i + 1) % CONCEPTS.length;
    show("Bonus concept");
  });
})();
